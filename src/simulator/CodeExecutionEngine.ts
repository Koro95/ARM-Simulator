import { Cpu } from "./Cpu";
import { Instruction, Operand, RegisterOperand, ImmediateOperand, ShiftOperand } from "./Instruction";

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
            this.currentInstruction = this.cpu.state.mainMemory.instructions[memoryAddress / 4];    
            console.log(this.currentInstruction); 
            this.executeInstruction();
        }
        else {
            this.cpu.newTerminalMessage("Invalid Memory Adress!")
        }
    }

    executeInstruction() {
        if (typeof this.currentInstruction !== 'undefined') {
            let inst = this.currentInstruction;
            let newRegisters = [...this.cpu.state.registers];
            let result;
            let op1 = this.getOperandValue(inst.getOp1());
            let op2 = this.getOperandValue(inst.getOp2());
            let op3 = this.getOperandValue(inst.getOp3());
            let op4 = this.getOperandValue(inst.getOp4());

            switch (inst.getType()) {
                case "art":
                    if (typeof op2 !== 'undefined' && typeof op3 !== 'undefined') {
                        result = this.arithmetic(inst, op2, op3, op4);
                    }
                    break;
                case "log":
                    if (typeof op1 !== 'undefined' && typeof op2 !== 'undefined') {
                        // AND, ORR, EOR, BIC have 3 operands and need result to update
                        if (typeof op3 !== 'undefined') {
                            result = this.logical(inst, op2, op3);
                        }
                        // CMP, CMN, TST, TEQ have 2 operands and don't need the result
                        else {
                            this.logical(inst, op1, op2);
                        }
                    }
                    break;
                case "cpj":
                    if (typeof op2 !== 'undefined') {
                        result = this.copyShiftJump(inst, op2);
                    }

            }

            // update registers
            if (typeof result !== 'undefined' && typeof op1 !== 'undefined') {
                newRegisters[op1] = this.setTo32Bit(result);
                newRegisters[15]+=4;
                this.cpu.setState({ registers: newRegisters });
            }
            if (inst.getUpdateStatusRegister()) {
                this.cpu.setState({ statusRegister: this.cpu.state.statusRegister });
            }
        }
        else {
            this.cpu.newTerminalMessage("Instructions finished!")
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

    copyShiftJump(inst: Instruction, b: number): number | undefined {
        let y = undefined;

        switch (inst.getInstruction()) {
            case "MOV": break;
            case "MVN":
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

        return result;
    }

    setTo32Bit(x: number): number {
        return x >>> 0;
    }
}