import { Cpu, MessageType } from "./Cpu";
import { ParseResult, PosInfo, ASTKinds, art, log, copyJump, loadStore, op, regOp, regImmOp, softwareInterrupt, loadStoreMultiple, regOpList } from '../parser/parser';

export { UserInputParser }

const parse = require('../parser/parser').parse;

/*
    Class for the user input parser, that gets the abstract syntax tree from the
    tsPEG parsers and calls correct functions to add instructions/data.

    cpu: Cpu
        Cpu that the parser is attached to
*/
class UserInputParser {
    cpu: Cpu;

    constructor(cpu: Cpu) {
        this.cpu = cpu;
    }

    /*
        Function that can be called to parse the current user input.

        The ASTKinds that is matched for each line has to be compared to the grammar.peg,
        because tsPEG labels "|" inputs with ascending numbers. Type of the line can be
        inferred from the function that is called, but probably has to be updated, when
        more possible matches are added in the grammar file.
    */
    parseUserInput() {
        // get result from tsPEG parser
        let parseResult: ParseResult = parse(this.cpu.state.userInput);
        let errs = parseResult.errs;
        let ast = parseResult.ast;

        // errors in parsing
        if (errs.length !== 0) {
            let pos: PosInfo = errs[0].pos;

            this.cpu.newTerminalMessage("Line " + pos.line + ":" + pos.offset + " - Unkown Instruction or Operand!", MessageType.Error)
            
             
            // Uncomment to output the expected regular expression
            /*
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
            */

        }
        // could parse the user input
        else if (ast !== null) {
            // reset the memory and get starting line
            this.cpu.state.mainMemory.resetMemory();
            let line = ast.start;

            let successful = true;

            // parse while not end of file (ASTKinds.line_5 = $)
            while (line.kind !== ASTKinds.line_5) {
                // get current line
                let currentLine = line.currentLine;

                // add label if line has one
                let label = line.label;
                if (label !== null) {
                    this.cpu.state.mainMemory.addLabel(this.cpu.state.mainMemory.getMemoryLines().size * 4, label.label)
                }

                // call correct function for type of line -> compare with grammar.peg or called function to get type of line
                switch (currentLine.kind) {
                    case ASTKinds.instruction_1: successful = this.parseArithmeticInstruction(currentLine.instruction); break;
                    case ASTKinds.instruction_2: successful = this.parseLogicInstruction(currentLine.instruction); break;
                    case ASTKinds.instruction_3: successful = this.parseCopyJumpInstruction(currentLine.instruction); break;
                    case ASTKinds.instruction_4: successful = this.parseLoadStoreInstruction(currentLine.instruction); break;
                    case ASTKinds.instruction_5: successful = this.parseLoadStoreMultipleInstruction(currentLine.instruction); break;
                    case ASTKinds.instruction_6: successful = this.parseSoftwareInterruptInstruction(currentLine.instruction); break;
                    case ASTKinds.variableLine: successful = this.addVariable(currentLine.variable, currentLine.label); break;
                    case ASTKinds.directive_1: successful = this.addASCIIData(currentLine.directive.data); break;
                    case ASTKinds.directive_2: successful = this.addData(currentLine.directive.size, "0"); break;
                }

                // stop if called function for line was not successful
                if (!successful) { break; }

                // otherwise switch to the next line
                line = line.nextLine;
            }

            // if every line was successful, update all elements
            if (successful) {
                // if a .global _start directive was found, set pc, and stacktrace to this address
                let startAddress = this.cpu.state.mainMemory.getLabelToAddress().get("_start");
                if (startAddress !== undefined) {
                    let newRegisters = [...this.cpu.state.registers];
                    newRegisters[15] = startAddress;

                    let newCodeExecutionEngine = this.cpu.state.codeExecutionEngine;
                    let newStackTrace = [];
                    newStackTrace.push(startAddress);
                    newCodeExecutionEngine.stackTrace = newStackTrace;

                    this.cpu.setState({ registers: newRegisters, codeExecutionEngine: newCodeExecutionEngine });
                }
                // otherwise output warning and start at 0
                else {
                    this.cpu.newTerminalMessage("No \"_start\" label found. Starting at 0x00000000", MessageType.Warning)
                }

                // update main memory component and go to start of memory
                this.cpu.state.mainMemory.setGoto(0x00000000);
                this.cpu.setState({ mainMemory: this.cpu.state.mainMemory, tab: 1 }, () => this.cpu.state.mainMemory.gotoMemoryAddress());
            }
            // otherwise reset memory
            else {
                this.cpu.state.mainMemory.resetMemory();
            }
        }
    }

    /*
        Function to get the correct operand based on the parsed type. Again need to be compared
        with the grammer file, if there are more operands for the same type.

        op: op | regOp | regImmOp | string
            Parsed operand

        return: string
            String representation of the operand
    */
    opToString(op: op | regOp | regImmOp | string): string {
        if (typeof op === 'string') {
            return op;
        }

        // return correct string or call function again for nested type, like in shifter operand
        switch (op.kind) {
            case ASTKinds.regOp_1: return op.regOp;
            case ASTKinds.op_1: return this.opToString(op.shiftOp.opToShift) + ", " + op.shiftOp.shiftType + " " + this.opToString(op.shiftOp.opShift);
            case ASTKinds.op_2: return this.opToString(op.regImmOp);
            case ASTKinds.regImmOp_1: return this.opToString(op.regOp);
            case ASTKinds.regImmOp_2: return op.immOp.immType + op.immOp.sign + op.immOp.base + op.immOp.number;
        }
    }

    /*
        Function to add a variable to the main memory.

        variableName: string
            Name of the Variable
        label: string
            Label from which the variable is calculated (len = . - msg)

        return: boolean
            True, if variable successfully added
    */
    addVariable(variableName: string, label: string): boolean {
        // get address of label
        let labelAdress = this.cpu.state.mainMemory.getLabelToAddress().get(label);

        // calculate variable from the current memory address and the label address
        if (labelAdress !== undefined) {
            let variable = this.cpu.state.mainMemory.getMemoryLines().size * 4 - labelAdress;
            this.cpu.state.mainMemory.getVariables().set(variableName, variable);
            return true;
        }
        // label undefined
        else {
            this.cpu.newTerminalMessage("Could not find label to calculate variable!", MessageType.Error)
            return false;
        }

    }

    /*
        Function to add ascii data to the main memory.

        data: string
            Data to be added

        return: boolean
            True, if data successfully added
    */
    addASCIIData(data: string): boolean {
        // counter for special character, because of extra \
        let specialCharacters = 0;

        // loop over characters
        for (; data.length > 0; data = data.substring(4 + specialCharacters)) {
            let encoding = 0;
            specialCharacters = 0;

            // 4 ascii characters per memory line
            for (let x = 0; x < 4; x++) {
                // read correct character
                let char = data.substring(x + specialCharacters, x + 1 + specialCharacters);

                // case for special character
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
                }

                // add encoding of character to correct position
                encoding += char.charCodeAt(0) << x * 8;
            }

            // after 4 character, add them to the memory line
            this.cpu.state.mainMemory.addData(this.cpu.state.mainMemory.getMemoryLines().size * 4, encoding)
        }

        return true;
    }

    /*
        Function to add data to the main memory.
        Currently only called for .space, which add sizeString "0"s.

        sizeString: string
            Size of the data to be added
        dataString: string
            Data to be added

        return: boolean
            True, if data successfully added
    */
    addData(sizeString: string, dataString: string): boolean {
        let size = parseInt(sizeString);
        let data = parseInt(dataString);

        // if both valid values, add data to memory
        if (!isNaN(size) && !isNaN(data) && data <= 255) {
            for (let x = 0; x < size;) {
                let memoryData = 0;
                for (let y = 0; y < 4 && x < size; y++, x++) {
                    memoryData += data << y * 8;
                }
                memoryData >>>= 0;
                this.cpu.state.mainMemory.addData(this.cpu.state.mainMemory.getMemoryLines().size * 4, memoryData);
            }
            return true;
        }
        else {
            this.cpu.newTerminalMessage(".space data too big (1 byte, <=255)!", MessageType.Error);
        }

        return false;
    }

    /*
        Function to add arithmetic instruction to memory.

        instruction: art
            Instruction to be added

        return: boolean
            True, if instruction successfully added
    */
    parseArithmeticInstruction(instruction: art): boolean {
        let op1, op2, op3, op4;
        let condition = instruction.cond.condType;
        let updateStatusReg = instruction.cond.updateStatusReg === null ? false : true;

        let successful = false;

        // get operands from the strings
        op1 = this.opToString(instruction.operands.op1);
        op2 = this.opToString(instruction.operands.op2);

        // add correct instruction depending on the operands
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

    /*
        Function to add logic instruction to memory.

        instruction: log
            Instruction to be added

        return: boolean
            True, if instruction successfully added
    */
    parseLogicInstruction(instruction: log): boolean {
        let op1, op2, op3;
        let condition = instruction.cond.condType;
        let updateStatusReg = instruction.cond.updateStatusReg === null ? false : true;

        // for these instruction always update status register
        if (["cmp", "cmn", "tst", "teq"].includes(instruction.inst)) { updateStatusReg = true };

        let successful = false;

        // get operands from the strings
        op1 = this.opToString(instruction.operands.op1);
        op2 = this.opToString(instruction.operands.op2);

        // add correct instruction depending on the operands
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

    /*
        Function to add copy or jump instruction to memory.

        instruction: copyJump
            Instruction to be added

        return: boolean
            True, if instruction successfully added
    */
    parseCopyJumpInstruction(instruction: copyJump): boolean {
        let op1, op2;
        let condition = instruction.cond.condType;
        let updateStatusReg = instruction.cond.updateStatusReg === null ? false : true;

        let successful = false;
        // get operands from the strings
        op1 = this.opToString(instruction.operands.op1);

        // add correct instruction depending on the operands
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

    /*
        Function to add load/store/swap instruction to memory.

        instruction: loadStore
            Instruction to be added

        return: boolean
            True, if instruction successfully added
    */
    parseLoadStoreInstruction(instruction: loadStore): boolean {
        let op1, op2, op3;
        let inst = instruction.inst;
        let format = ""

        // add format if operands have one
        if (instruction.kind === ASTKinds.loadStore_1 || instruction.kind === ASTKinds.loadStore_2) {
            format = instruction.format;
        }
        let condition = instruction.cond.condType;

        let successful = false;

        // get operands from the strings
        op1 = this.opToString(instruction.operands.op1);

        // add correct instruction depending on the operands
        switch (instruction.operands.kind) {
            // LoadStoreOperand -> add correct operands depending on pre-/postindexed
            case ASTKinds.loadStoreOp:
                switch (instruction.operands.op2.kind) {
                    case ASTKinds.addressingMode_1:
                        op2 = "[" + this.opToString(instruction.operands.op2.reg) + "]";
                        if (instruction.operands.op2.offset !== null) {
                            op2 += "," + instruction.operands.op2.offset.sign + this.opToString(instruction.operands.op2.offset.offset);
                        }
                        successful = this.cpu.state.mainMemory.addInstruction(inst + format, condition, false, op1, op2, undefined, undefined);
                        break;
                    case ASTKinds.addressingMode_2:
                        op2 = "[" + this.opToString(instruction.operands.op2.reg);
                        if (instruction.operands.op2.offset !== null) {
                            op2 += "," + instruction.operands.op2.offset.sign + this.opToString(instruction.operands.op2.offset.offset);
                        }
                        op2 += ']';
                        if (instruction.operands.op2.increment !== null) { op2 += "!"; }
                        successful = this.cpu.state.mainMemory.addInstruction(inst + format, condition, false, op1, op2, undefined, undefined);
                        break;
                }
                break;
            case ASTKinds.swpOp:
                op2 = this.opToString(instruction.operands.op2);
                op3 = this.opToString(instruction.operands.op3);
                successful = this.cpu.state.mainMemory.addInstruction(inst + format, condition, false, op1, op2, op3, undefined);
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

    /*
        Function to add load/store multiple instruction to memory.

        instruction: loadStoreMultiple
            Instruction to be added

        return: boolean
            True, if instruction successfully added
    */
    parseLoadStoreMultipleInstruction(instruction: loadStoreMultiple): boolean {
        let op1, op2;
        let addressingMode = instruction.addressingMode;
        let condition = instruction.cond.condType;

        let successful = false;
        // get operands from the strings
        op1 = this.opToString(instruction.operands.op1);
        let increment = instruction.operands.increment;
        if (increment !== null) { op1 += increment; }

        // from correct second operand
        op2 = "{";

        let currentOp = instruction.operands.op2;
        while (currentOp.kind !== ASTKinds.regOpList_2) {
            op2 += this.regOpListToString(currentOp) + ",";
            currentOp = currentOp.nextOp;
        }

        op2 += this.regOpListToString(currentOp) + "}";

        // add instruction
        successful = this.cpu.state.mainMemory.addInstruction(instruction.inst + addressingMode, condition, false, op1, op2, undefined, undefined);
        return successful;
    }

    /*
        Function to assemble the load/store multiple operand

        regOpList: regOpList
            Register list operand

        return: string
            String representation of the register list operand
    */
    regOpListToString(regOpList: regOpList): string {
        let string = "";

        // either return single register or register range
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

    /*
        Function to add a software interrupt to memory.

        instruction: softwareInterrupt
            Instruction to be added

        return: boolean
            True, if instruction successfully added
    */
    parseSoftwareInterruptInstruction(instruction: softwareInterrupt): boolean {
        let condition = instruction.cond.condType;

        let successful = this.cpu.state.mainMemory.addInstruction(instruction.inst, condition, false, undefined, undefined, undefined, undefined);

        return successful;
    }
}