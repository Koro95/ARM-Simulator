import { Cpu, MessageType } from "./Cpu";
import { ParseResult, PosInfo, MatchAttempt, ASTKinds, art, log, copyJump, op , regOp, regImmOp} from '../parser/parser';

export { UserInputParser }

const parse = require('../parser/parser').parse;

class UserInputParser {
    cpu: Cpu;

    constructor(cpu: Cpu) {
        this.cpu = cpu;
    }

    parseUserInput() {
        let parseResult: ParseResult = parse(this.cpu.state.userInput.toLowerCase());
        let errs = parseResult.errs;
        let ast = parseResult.ast;

        this.cpu.setState({ open: true, error: errs.length ? "Error found" : "Parsed" })


        if (errs.length !== 0) {
            let pos: PosInfo = errs[0].pos;

            let matches: Array<MatchAttempt> = errs[0].expmatches
            let matchesString = "";
            matches.forEach(e => {
                if (e.kind === 'RegexMatch') {
                    matchesString += e.literal + ", "
                }
            })

            this.cpu.newTerminalMessage(MessageType.Error, "Line " + pos.line + ":" + pos.offset + " - Expected: " + matchesString.slice(0, -2))
        }
        else if (ast !== null) {
            this.cpu.state.mainMemory.resetMemory();
            let line = ast.start;

            let successful = false;

            while (line.kind !== ASTKinds.$EOF) {
                let currentLine = line.currentLine;

                switch (currentLine.kind) {
                    case ASTKinds.instruction_1: successful = this.parseArithmeticInstruction(currentLine.instruction); break;
                    case ASTKinds.instruction_2: successful = this.parseLogicInstruction(currentLine.instruction); break;
                    case ASTKinds.instruction_3: successful = this.parseCopyJumpInstruction(currentLine.instruction); break;
                    case ASTKinds.label: successful = this.cpu.state.mainMemory.addLabel(this.cpu.state.mainMemory.memoryLines.size * 4, currentLine.label);
                }
                line = line.nextLine;
            }

            if (successful) {
                this.cpu.state.mainMemory.compile();
                this.cpu.setState({ tab: 1 });
            }
        }
    }

    opToString(op: op | regOp | regImmOp | string): string {
        if (typeof op === 'string') {
            return op;
        }

        switch (op.kind) {
            case ASTKinds.regOp: return op.regOp;
            case ASTKinds.op_1: return this.opToString(op.shiftOp.opToShift) + ", " + op.shiftOp.shiftType + " " + this.opToString(op.shiftOp.opShift);
            case ASTKinds.op_2: return this.opToString(op.regImmOp);
            case ASTKinds.regImmOp_1: return this.opToString(op.regOp);
            case ASTKinds.regImmOp_2: return op.immOp.immType + op.immOp.base + op.immOp.number;
        }
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
                successful = this.cpu.state.mainMemory.addInstruction(instruction.inst, condition, updateStatusReg, op1, op2, undefined, undefined);
                break;
            case "artMulOp":
                op3 =  this.opToString(instruction.operands.op3);
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
                successful = this.cpu.state.mainMemory.addInstruction(instruction.inst, condition, updateStatusReg, op1, op2, undefined, undefined);
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
            case "copyOp":
                op2 = this.opToString(instruction.operands.op2);
                successful = this.cpu.state.mainMemory.addInstruction(instruction.inst, condition, updateStatusReg, op1, op2, undefined, undefined);
                break;
            case "jumpOp":
                successful = this.cpu.state.mainMemory.addInstruction(instruction.inst, condition, updateStatusReg, op1, undefined, undefined, undefined);
                break;
        }

        return successful;
    }
}