import { Cpu, MessageType } from "./Cpu";
import { ParseResult, PosInfo, MatchAttempt, ASTKinds, art, log, copyJump, loadStore, op, regOp, regImmOp, softwareInterrupt, loadStoreMultiple, regOpList } from '../parser/parser';

export { UserInputParser }

const parse = require('../parser/parser').parse;

class UserInputParser {
    cpu: Cpu;

    constructor(cpu: Cpu) {
        this.cpu = cpu;
    }

    parseUserInput() {
        let parseResult: ParseResult = parse(this.cpu.state.userInput);
        let errs = parseResult.errs;
        let ast = parseResult.ast;

        if (errs.length !== 0) {
            let pos: PosInfo = errs[0].pos;

            let matches: Array<MatchAttempt> = errs[0].expmatches
            let matchesString = "";
            matches.forEach(e => {
                if (e.kind === 'RegexMatch') {
                    matchesString += e.literal + ", "
                }
            })

            matchesString = matchesString.slice(0, -2);

            // if it expects only ":", thinks instruction is a label
            if (matchesString === ":") {
                this.cpu.newTerminalMessage("Line " + pos.line + ":" + pos.offset + " - Unkown Instruction", MessageType.Error)
            }
            else {
                this.cpu.newTerminalMessage("Line " + pos.line + ":" + pos.offset + " - Expected: " + matchesString, MessageType.Error)
            }

        }
        else if (ast !== null) {
            this.cpu.state.mainMemory.resetMemory();
            let line = ast.start;

            let successful = true;

            while (line.kind !== ASTKinds.line_5) {
                let currentLine = line.currentLine;
                let label = line.label;

                if (label !== null) {
                    this.cpu.state.mainMemory.addLabel(this.cpu.state.mainMemory.memoryLines.size * 4, label.label)
                }

                switch (currentLine.kind) {
                    case ASTKinds.instruction_1: successful = this.parseArithmeticInstruction(currentLine.instruction); break;
                    case ASTKinds.instruction_2: successful = this.parseLogicInstruction(currentLine.instruction); break;
                    case ASTKinds.instruction_3: successful = this.parseCopyJumpInstruction(currentLine.instruction); break;
                    case ASTKinds.instruction_4: successful = this.parseLoadStoreInstruction(currentLine.instruction); break;
                    case ASTKinds.instruction_5: successful = this.parseLoadStoreMultipleInstruction(currentLine.instruction); break;
                    case ASTKinds.instruction_6: successful = this.parseSoftwareInterruptInstruction(currentLine.instruction); break;
                    case ASTKinds.variableLine: successful = this.addVariable(currentLine.variable, currentLine.label); break;
                    case ASTKinds.directive_1: successful = this.addASCIIData(currentLine.directive.data); break;
                }

                if (!successful) { break; }

                line = line.nextLine;
            }

            if (successful) {             
                let startAddress =  this.cpu.state.mainMemory.labelToAddress.get("_start");
                if (startAddress !== undefined) {         
                    let newRegisters = [...this.cpu.state.registers];
                    newRegisters[15] = startAddress;
                    let newStackTrace = [startAddress]
                    this.cpu.state.codeExecutionEngine.stackTrace = newStackTrace;
                    this.cpu.setState({ registers: newRegisters, codeExecutionEngine: this.cpu.state.codeExecutionEngine })
                }
                else {
                    this.cpu.newTerminalMessage("No \"_start\" label found. Starting at 0x00000000", MessageType.Warning)
                }

                this.cpu.state.mainMemory.goto = 0x00000000;
                this.cpu.setState({ mainMemory: this.cpu.state.mainMemory, tab: 1 }, () => this.cpu.state.mainMemory.gotoMemoryAddress());
            }
            else {
                this.cpu.state.mainMemory.resetMemory();
            }
        }
    }

    opToString(op: op | regOp | regImmOp | string): string {
        if (typeof op === 'string') {
            return op;
        }

        switch (op.kind) {
            case ASTKinds.regOp_1: return op.regOp;
            case ASTKinds.op_1: return this.opToString(op.shiftOp.opToShift) + ", " + op.shiftOp.shiftType + " " + this.opToString(op.shiftOp.opShift);
            case ASTKinds.op_2: return this.opToString(op.regImmOp);
            case ASTKinds.regImmOp_1: return this.opToString(op.regOp);
            case ASTKinds.regImmOp_2: return op.immOp.immType + op.immOp.sign + op.immOp.base + op.immOp.number;
        }
    }

    addVariable(variableName: string, label: string): boolean {
        let labelAdress = this.cpu.state.mainMemory.labelToAddress.get(label);

        if (labelAdress !== undefined) {
            let variable = this.cpu.state.mainMemory.memoryLines.size * 4 - labelAdress;
            this.cpu.state.mainMemory.variables.set(variableName, variable);
            return true;
        }
        else {
            this.cpu.newTerminalMessage("Could not find label to calculate variable!", MessageType.Error)
            return false;
        }

    }

    addASCIIData(data: string): boolean {
        let specialCharacters = 0;
        for (; data.length > 0; data = data.substring(4 + specialCharacters)) {
            let encoding = 0;
            specialCharacters = 0;

            for (let x = 0; x < 4; x++) {
                let char = data.substring(x + specialCharacters, x + 1 + specialCharacters);
                if (char.charCodeAt(0) === 92) {
                    specialCharacters++;
                    char = data.substring(x + specialCharacters, x + 1 + specialCharacters);
                    switch (char) {
                        case "\\": char = "\\"; break;
                        case "n": char = "\n"; break;
                        case "t": char = "\t"; break;
                        default:
                            this.cpu.newTerminalMessage("\\" + char + " invalid escape character!", MessageType.Error)
                            return false;
                    }
                    char = "\n";
                }
                encoding += char.charCodeAt(0) << x * 8;
            }

            this.cpu.state.mainMemory.addData(this.cpu.state.mainMemory.memoryLines.size * 4, encoding)
        }
        return true;
    }

    parseArithmeticInstruction(instruction: art): boolean {
        let op1, op2, op3, op4;
        let condition = instruction.cond.condType;
        let updateStatusReg = instruction.cond.updateStatusReg === null ? false : true;

        let successful = false;

        op1 = this.opToString(instruction.operands.op1);
        op2 = this.opToString(instruction.operands.op2);
        switch (instruction.operands.kind) {
            case "artOp3":
                op3 = this.opToString(instruction.operands.op3);
                successful = this.cpu.state.mainMemory.addInstruction(instruction.inst, condition, updateStatusReg, op1, op2, op3, undefined);
                break;
            case "artOp2":
                successful = this.cpu.state.mainMemory.addInstruction(instruction.inst, condition, updateStatusReg, op1, op2, "", undefined);
                break;
            case "artMulOp":
                op3 = this.opToString(instruction.operands.op3);
                successful = this.cpu.state.mainMemory.addInstruction(instruction.inst, condition, updateStatusReg, op1, op2, op3, undefined);
                break;
            case "artMlaOp":
                op3 = this.opToString(instruction.operands.op3);
                op4 = this.opToString(instruction.operands.op4);
                successful = this.cpu.state.mainMemory.addInstruction(instruction.inst, condition, updateStatusReg, op1, op2, op3, op4);
                break;
        }

        return successful;
    }

    parseLogicInstruction(instruction: log): boolean {
        let op1, op2, op3;
        let condition = instruction.cond.condType;
        let updateStatusReg = instruction.cond.updateStatusReg === null ? false : true;

        if (["cmp", "cmn", "tst", "teq"].includes(instruction.inst)) { updateStatusReg = true };

        let successful = false;

        op1 = this.opToString(instruction.operands.op1);
        op2 = this.opToString(instruction.operands.op2);

        switch (instruction.operands.kind) {
            case "logOp3":
                op3 = this.opToString(instruction.operands.op3);
                successful = this.cpu.state.mainMemory.addInstruction(instruction.inst, condition, updateStatusReg, op1, op2, op3, undefined);
                break;
            case "logOp2":
                successful = this.cpu.state.mainMemory.addInstruction(instruction.inst, condition, updateStatusReg, op1, op2, "", undefined);
                break;
        }

        return successful;
    }

    parseCopyJumpInstruction(instruction: copyJump): boolean {
        let op1, op2;
        let condition = instruction.cond.condType;
        let updateStatusReg = instruction.cond.updateStatusReg === null ? false : true;

        let successful = false;

        op1 = this.opToString(instruction.operands.op1);

        switch (instruction.operands.kind) {
            case ASTKinds.copyOp:
                op2 = this.opToString(instruction.operands.op2);
                successful = this.cpu.state.mainMemory.addInstruction(instruction.inst, condition, updateStatusReg, op1, op2, undefined, undefined);
                break;
            case ASTKinds.jumpOp:
                successful = this.cpu.state.mainMemory.addInstruction(instruction.inst, condition, updateStatusReg, op1, undefined, undefined, undefined);
                break;
        }

        return successful;
    }

    parseLoadStoreInstruction(instruction: loadStore): boolean {
        let op1, op2;
        let condition = instruction.cond.condType;

        let successful = false;

        op1 = this.opToString(instruction.operands.op1);


        switch (instruction.operands.kind) {
            case ASTKinds.loadStoreOp:
                switch (instruction.operands.op2.kind) {
                    case ASTKinds.addressingMode_1:
                        op2 = "[" + this.opToString(instruction.operands.op2.reg) + "]";
                        if (instruction.operands.op2.offset !== null) {
                            op2 += "," + instruction.operands.op2.offset.sign + this.opToString(instruction.operands.op2.offset.offset);
                        }
                        successful = this.cpu.state.mainMemory.addInstruction(instruction.inst, condition, false, op1, op2, undefined, undefined);
                        break;
                    case ASTKinds.addressingMode_2:
                        op2 = "[" + this.opToString(instruction.operands.op2.reg);
                        if (instruction.operands.op2.offset !== null) {
                            op2 += "," + instruction.operands.op2.offset.sign + this.opToString(instruction.operands.op2.offset.offset);
                        }
                        op2 += ']';
                        if (instruction.operands.op2.increment !== null) { op2 += "!"; }
                        successful = this.cpu.state.mainMemory.addInstruction(instruction.inst, condition, false, op1, op2, undefined, undefined);
                        break;
                }
                break;
            case ASTKinds.loadImmediateOp:
                op2 = instruction.operands.op2
                successful = this.cpu.state.mainMemory.addInstruction(instruction.inst, condition, false, op1, op2.immType + op2.sign + op2.base + op2.number, undefined, undefined);
                break;
            case ASTKinds.loadImmediateBranchOp:
                op2 = "=" + instruction.operands.op2;
                if (instruction.operands.offset !== null) { op2 += instruction.operands.offset };
                successful = this.cpu.state.mainMemory.addInstruction(instruction.inst, condition, false, op1, op2, undefined, undefined);
                break;
        }

        return successful;
    }

    parseLoadStoreMultipleInstruction(instruction: loadStoreMultiple): boolean {
        let op1, op2;
        let addressingMode = instruction.addressingMode;
        let condition = instruction.cond.condType;

        let successful = false;

        op1 = this.opToString(instruction.operands.op1);
        let increment = instruction.operands.increment;
        if (increment !== null) { op1 += increment; }

        op2 = "{";

        let currentOp = instruction.operands.op2;
        while (currentOp.kind !== ASTKinds.regOpList_2) {
            op2 += this.regOpListToString(currentOp) + ",";
            currentOp = currentOp.nextOp;
        }

        op2 += this.regOpListToString(currentOp) + "}";

        successful = this.cpu.state.mainMemory.addInstruction(instruction.inst + addressingMode, condition, false, op1, op2, undefined, undefined);
        return successful;
    }

    regOpListToString(regOpList: regOpList): string {
        let string = "";

        switch (regOpList.op.kind) {
            case ASTKinds.regOpOrRange_1:
                string += this.opToString(regOpList.op.op.op1) + "-" + this.opToString(regOpList.op.op.op2);
                break;
            case ASTKinds.regOpOrRange_2:
                string += this.opToString(regOpList.op.op);
                break;
        }

        return string;
    }

    parseSoftwareInterruptInstruction(instruction: softwareInterrupt): boolean {
        let condition = instruction.cond.condType;

        let successful = this.cpu.state.mainMemory.addInstruction(instruction.inst, condition, false, undefined, undefined, undefined, undefined);

        return successful;
    }
}