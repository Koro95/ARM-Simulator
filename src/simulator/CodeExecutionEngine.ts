import { Cpu, MessageType } from "./Cpu";
import { Instruction, ArithmeticInstruction, LogicInstruction, CopyJumpInstruction, Operand, RegisterOperand, ImmediateOperand, ShiftOperand, BranchOperand } from "./InstructionsAndOperands";

export { CodeExecutionEngine };

class CodeExecutionEngine {
    cpu: Cpu;
    currentInstruction: Instruction | undefined;
    stop: boolean;

    constructor(cpu: Cpu) {
        this.cpu = cpu;
        this.currentInstruction = undefined;
        this.stop = false;
    }

    executeNextInstruction(): boolean {
        let memoryAddress = this.cpu.state.registers[15];
        if (memoryAddress % 4 === 0) {
            this.currentInstruction = this.cpu.state.mainMemory.memoryLines.get(memoryAddress)?.getContent();
            return this.executeInstruction();
        }
        else {
            this.cpu.newTerminalMessage(MessageType.Error, "Invalid Memory Adress!");
            return false;
        }
    }

    continue() {
        if (this.executeNextInstruction() && !this.stop) {
            setTimeout(() => this.cpu.setState({}, () => this.continue()), 0)
        }
    }

    executeInstruction(): boolean {
        if (typeof this.currentInstruction !== 'undefined') {
            let inst = this.currentInstruction;
            let newRegisters = [...this.cpu.state.registers];

            newRegisters[15] += 4;
            this.cpu.setState({ registers: newRegisters });

            let condition = inst.getCondition();
            let flags = this.cpu.state.statusRegister.getFlags();

            switch (condition) {
                case "eq": if (flags[1]) { break; } return true;
                case "ne": if (!flags[1]) { break; } return true;
                case "hs": case "cs": if (flags[2]) { break; } return true;
                case "lo": case "cc": if (!flags[2]) { break; } return true;
                case "mi": if (flags[0]) { break; } return true;
                case "pl": if (!flags[0]) { break; } return true;
                case "vs": if (flags[3]) { break; } return true;
                case "vc": if (!flags[3]) { break; } return true;
                case "hi": if (flags[2] * Number(!flags[1])) { break; } return true;
                case "ls": if (Number(!flags[2]) + flags[1]) { break; } return true;
                case "ge": if (flags[0] * flags[3] + Number(!flags[0]) * Number(!flags[3])) { break; } return true;
                case "lt": if (flags[0] * Number(!flags[3]) + Number(!flags[0]) * flags[3]) { break; } return true;
                case "gt": if (Number(!flags[1]) * flags[0] * flags[3] +
                    Number(!flags[1]) * Number(!flags[0]) * Number(!flags[3])) { break; } return true;
                case "le": if (flags[0] * Number(!flags[3]) + flags[1] +
                    Number(!flags[0]) * flags[3]) { break; } return true;
                case "al": break;
                case "nv": return true;
            }

            let result;
            let op1, op2, op3, op4;
            let targetRegister;

            if (inst instanceof ArithmeticInstruction) {
                let x = inst.getOp1();
                if (x instanceof RegisterOperand && typeof x !== 'undefined') { targetRegister = x.getIndex() };
                op1 = this.getOperandValue(inst.getOp1());
                op2 = this.getOperandValue(inst.getOp2());
                op3 = this.getOperandValue(inst.getOp3());
                op4 = this.getOperandValue(inst.getOp4());
                if (typeof op2 !== 'undefined') {
                    if (typeof op3 !== 'undefined') {
                        result = this.arithmetic(inst, op2, op3, op4);
                    }
                    else if (typeof op1 !== 'undefined') {
                        result = this.arithmetic(inst, op1, op2, op4);
                    }
                }
            }
            else if (inst instanceof LogicInstruction) {
                let x = inst.getOp1();
                if (x instanceof RegisterOperand && typeof x !== 'undefined') { targetRegister = x.getIndex() };
                op1 = this.getOperandValue(inst.getOp1());
                op2 = this.getOperandValue(inst.getOp2());
                op3 = this.getOperandValue(inst.getOp3());
                if (typeof op2 !== 'undefined') {
                    // AND, ORR, EOR, BIC have 3 operands and need result to update
                    if (typeof op3 !== 'undefined') {
                        result = this.logical(inst, op2, op3);
                    }
                    else if (typeof op1 !== 'undefined') {
                        result = this.logical(inst, op1, op2);
                    }
                }
            }
            else if (inst instanceof CopyJumpInstruction) {
                let x = inst.getOp1();
                if (x instanceof RegisterOperand && typeof x !== 'undefined') {
                    targetRegister = x.getIndex()

                    op2 = this.getOperandValue(inst.getOp2());
                    if (typeof op2 !== 'undefined') {
                        result = this.copy(inst, op2);
                    }
                }
                else if (x instanceof BranchOperand && typeof x !== 'undefined') {
                    let address = this.cpu.state.mainMemory.labelToAddress.get(x.toString());
                    newRegisters[15] -= 4;

                    if (typeof address !== 'undefined') {
                        if (inst.getInstruction() === "bl") {
                            newRegisters[14] = newRegisters[15]
                        }
                        newRegisters[15] = address;
                        this.cpu.setState({ registers: newRegisters });
                    }
                    else {
                        this.cpu.setState({ registers: newRegisters });
                        this.cpu.newTerminalMessage(MessageType.Error, "Invalid branch label!")
                        return false;
                    }
                }
            }

            // update registers
            if (typeof result !== 'undefined' && typeof targetRegister !== 'undefined') {
                newRegisters[targetRegister] = this.setTo32Bit(result);
                this.cpu.setState({ registers: newRegisters });
            }
            if (inst.getUpdateStatusRegister()) {
                this.cpu.setState({ statusRegister: this.cpu.state.statusRegister });
            }
            return true;
        }
        else {
            this.cpu.newTerminalMessage(MessageType.Warning, "Instructions finished!")
            return false;
        }
    }

    arithmetic(inst: Instruction, a: number, b: number, x?: number): number | undefined {
        let y = undefined;
        let isArithmetic = true;

        switch (inst.getInstruction()) {
            case "add": y = (a + b); break;
            case "adc": y = (a + b + this.cpu.state.statusRegister.getC()); break;
            case "sub": b = ~b; y = (a + b + 1); break;
            case "sbc": b = ~b; y = (a + b + 1 + this.cpu.state.statusRegister.getC() - 1); break;
            case "rsb": b = ~b; y = (b + a + 1); break;
            case "rsc": b = ~b; y = (b + a + 1 + this.cpu.state.statusRegister.getC() - 1); break;
            case "mul": y = (a * b); isArithmetic = false; break;
            case "mla": y = ((typeof x !== 'undefined') ? (a * b) + x : undefined); isArithmetic = false;
        }

        if (inst.getUpdateStatusRegister() && typeof y !== 'undefined') {
            this.cpu.state.statusRegister.updateFlags(isArithmetic, y, a, b);
        }

        return y;
    }

    logical(inst: Instruction, a: number, b: number,): number | undefined {
        let y = undefined;
        let isArithmetic = false;
        let updateStatusRegister = inst.getUpdateStatusRegister();
        let resultNeeded = true;

        switch (inst.getInstruction()) {
            case "and": y = (a & b); break;
            case "orr": y = (a | b); break;
            case "teq": y = (a ^ b); break;
            case "bic": b = ~b; y = (a & b); break;
            case "cmp": b = ~b; y = (a + b + 1); isArithmetic = true; resultNeeded = false; break;
            case "cmn": y = (a + b); isArithmetic = true; resultNeeded = false; break;
            case "tst": y = (a & b); resultNeeded = false; break;
            case "eor": y = (a ^ b); resultNeeded = false;
        }

        if (updateStatusRegister && typeof y !== 'undefined') {
            this.cpu.state.statusRegister.updateFlags(isArithmetic, y, a, b);
        }

        if (resultNeeded) {
            return y;
        }
        return undefined;
    }

    copy(inst: Instruction, b: number): number | undefined {
        let y = undefined;

        switch (inst.getInstruction()) {
            case "mov": y = b; break;
            case "mvn": y = ~b; break;
        }

        return y;
    }

    getOperandValue(operand: Operand | undefined): number | undefined {
        if (operand instanceof RegisterOperand) {
            return this.cpu.state.registers[operand.getIndex()];
        }
        else if (operand instanceof ImmediateOperand) {
            return operand.getValue();
        }
        else if (operand instanceof ShiftOperand) {
            return this.barrelShifter(operand);
        }
        else {
            return undefined;
        }
    }

    barrelShifter(shiftOperand: ShiftOperand | undefined): number | undefined {
        if (typeof shiftOperand === 'undefined') {
            return undefined;
        }

        let result;
        let x = this.getOperandValue(shiftOperand.getOperandToShift())
        let shiftAmount = this.getOperandValue(shiftOperand.getShiftAmountOperand());
        let carry;

        if (typeof x !== 'undefined' && typeof shiftAmount !== 'undefined') {
            switch (shiftOperand.getShiftType()) {
                case "lsl":
                case "asl":
                    result = x << shiftAmount;
                    carry = (x << (shiftAmount - 1)) & 0x80000000;
                    break;
                case "lsr":
                    result = x >>> shiftAmount;
                    carry = (x >>> (shiftAmount - 1)) & 1;
                    break;
                case "asr":
                    result = x >> shiftAmount;
                    carry = (x >> (shiftAmount - 1)) & 1;
                    break;
                case "ror":
                    result = (x >>> shiftAmount) | (x << (32 - shiftAmount));
                    carry = (x >>> (shiftAmount - 1)) & 1;
                    break;
                // TODO RRX only by 1 bit?
                case "rrx":
                    result = (x >>> shiftAmount) | (x << (32 - shiftAmount + 1));
                    result |= (this.cpu.state.statusRegister.getC() << (32 - shiftAmount));
                    carry = (x >>> (shiftAmount - 1)) & 1;
                    break;
            }
        }

        if (typeof this.currentInstruction !== 'undefined' && this.currentInstruction.getUpdateStatusRegister() && typeof carry !== 'undefined') {
            this.cpu.state.statusRegister.setC(carry === 0 ? 0 : 1);
        }

        return (typeof result !== 'undefined') ? this.setTo32Bit(result) : result;
    }

    setTo32Bit(x: number): number {
        return x >>> 0;
    }
}