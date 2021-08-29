import { Cpu, MessageType } from "./Cpu";
import { Instruction, ArithmeticInstruction, LogicInstruction, CopyJumpInstruction, Operand, RegisterOperand, ImmediateOperand, ShiftOperand } from "./InstructionsAndOperands";

export { CodeExecutionEngine };

class CodeExecutionEngine {
    cpu: Cpu;
    currentInstruction: Instruction | undefined;

    constructor(cpu: Cpu) {
        this.cpu = cpu;
        this.currentInstruction = undefined;
    }

    executeNextInstruction() {
        let memoryAddress = this.cpu.state.registers[15];
        if (memoryAddress % 4 === 0) {
            this.currentInstruction = this.cpu.state.mainMemory.memoryLines.get(memoryAddress)?.getContent();
            this.executeInstruction();
        }
        else {
            this.cpu.newTerminalMessage(MessageType.Error, "Invalid Memory Adress!")
        }
    }

    executeInstruction() {
        if (typeof this.currentInstruction !== 'undefined') {
            let inst = this.currentInstruction;
            let newRegisters = [...this.cpu.state.registers];
            
            newRegisters[15] += 4;
            this.cpu.setState({ registers: newRegisters });

            let condition = inst.getCondition();
            let flags = this.cpu.state.statusRegister.getFlags();

            switch (condition) {
                case "EQ": if (flags[1]) { break; } return;
                case "NE": if (!flags[1]) { break; } return;
                case "HS": case "CS": if (flags[2]) { break; } return;
                case "LO": case "CC": if (!flags[2]) { break; } return;
                case "MI": if (flags[0]) { break; } return;
                case "PL": if (!flags[0]) { break; } return;
                case "VS": if (flags[3]) { break; } return;
                case "VC": if (!flags[3]) { break; } return;
                case "HI": if (flags[2] * Number(!flags[1])) { break; } return;
                case "LS": if (Number(!flags[2]) + flags[1]) { break; } return;
                case "GE": if (flags[0] * flags[3] + Number(!flags[0]) * Number(!flags[3])) { break; } return;
                case "LT": if (flags[0] * Number(!flags[3]) + Number(!flags[0]) * flags[3]) { break; } return;
                case "GT": if (Number(!flags[1]) * flags[0] * flags[3] +
                    Number(!flags[1]) * Number(!flags[0]) * Number(!flags[3])) { break; } return;
                case "LE": if (flags[0] * Number(!flags[3]) + flags[1] + 
                    Number(!flags[0]) * flags[3]) { break; } return;
                case "AL": break;
                case "NV": return;
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
                    // CMP, CMN, TST, TEQ have 2 operands and don't need the result
                    else if (typeof op1 !== 'undefined') {
                        this.logical(inst, op1, op2);
                    }
                }
            }
            else if (inst instanceof CopyJumpInstruction) {
                let x = inst.getOp1();
                if (x instanceof RegisterOperand && typeof x !== 'undefined') { targetRegister = x.getIndex() };
                op1 = this.getOperandValue(inst.getOp1());
                op2 = this.getOperandValue(inst.getOp2());
                if (typeof op2 !== 'undefined') {
                    result = this.copyJump(inst, op2);
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
        }
        else {
            this.cpu.newTerminalMessage(MessageType.Warning, "Instructions finished!")
        }
    }

    arithmetic(inst: Instruction, a: number, b: number, x?: number): number | undefined {
        let y = undefined;
        let isArithmetic = true;

        switch (inst.getInstruction()) {
            case "ADD": y = (a + b); break;
            case "ADC": y = (a + b + this.cpu.state.statusRegister.getC()); break;
            case "SUB": y = (a + (~b + 1)); break;
            case "SBC": y = (a + (~b + 1) + this.cpu.state.statusRegister.getC() - 1); break;
            case "RSB": y = (b + (~a + 1)); break;
            case "RSC": y = (b + (~a + 1) + this.cpu.state.statusRegister.getC() - 1); break;
            case "MUL": y = (a * b); isArithmetic = false; break;
            case "MLA": y = ((typeof x !== 'undefined') ? (a * b) + x : undefined); isArithmetic = false;
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

        switch (inst.getInstruction()) {
            case "AND": y = (a & b); break;
            case "ORR": y = (a | b); break;
            case "TEQ": y = (a ^ b); break;
            case "BIC": y = (a & (~b)); break;
            case "CMP": y = (a + (~b + 1)); isArithmetic = true; updateStatusRegister = true; break;
            case "CMN": y = (a + b); isArithmetic = true; updateStatusRegister = true; break;
            case "TST": y = (a & b); updateStatusRegister = true; break;
            case "EOR": y = (a ^ b); updateStatusRegister = true;
        }

        if (updateStatusRegister && typeof y !== 'undefined') {
            this.cpu.state.statusRegister.updateFlags(isArithmetic, y, a, b);
        }

        return y;
    }

    copyJump(inst: Instruction, b: number): number | undefined {
        let y = undefined;

        switch (inst.getInstruction()) {
            case "MOV": y = b; break;
            case "MVN": y = ~b;
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
                case "LSL":
                case "ASL":
                    result = x << shiftAmount;
                    carry = (x << (shiftAmount - 1)) & 0x80000000;
                    break;
                case "LSR":
                    result = x >>> shiftAmount;
                    carry = (x >>> (shiftAmount - 1)) & 1;
                    break;
                case "ASR":
                    result = x >> shiftAmount;
                    carry = (x >> (shiftAmount - 1)) & 1;
                    break;
                case "ROR":
                    result = (x >>> shiftAmount) | (x << (32 - shiftAmount));
                    carry = (x >>> (shiftAmount - 1)) & 1;
                    break;
                case "RRX":
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