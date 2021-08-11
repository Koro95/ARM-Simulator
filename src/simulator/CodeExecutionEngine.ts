import { Cpu } from "./Cpu";
import { Instruction } from "./Instruction";

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
            this.executeInstruction();
        }
        else {
            let message = "\n<" + new Date().toLocaleTimeString() + "> Invalid Memory Adress!";
            let newTerminal = this.cpu.state.terminal + message;
            this.cpu.setState({ terminal: newTerminal })
        }
    }

    executeInstruction() {
        if (typeof this.currentInstruction !== 'undefined') {
            let inst = this.currentInstruction;
            let newRegisters = [...this.cpu.state.registers];

            switch (inst.type) {
                case "art":
                    if (typeof inst.op2 !== 'undefined' && typeof inst.op3 !== 'undefined') {
                        let a = newRegisters[inst.op2];
                        let b = this.barrelShifter(inst, newRegisters[inst.op3]);
                        let x = (typeof inst.op4 !== 'undefined') ? newRegisters[inst.op4] : inst.op4;

                        inst.result = this.arithmetic(inst, a, b, x);
                    }
                    break;
                case "log":
                    if (typeof inst.op1 !== 'undefined' && typeof inst.op2 !== 'undefined') {
                        // AND, ORR, EOR, BIC have 3 operands and need result to update
                        if (typeof inst.op3 !== 'undefined') {
                            let a = newRegisters[inst.op2];
                            let b = this.barrelShifter(inst, newRegisters[inst.op3]);

                            inst.result = this.logical(inst, a, b);
                        }
                        // CMP, CMN, TST, TEQ have 2 operands and don't need the result
                        else {
                            let a = newRegisters[inst.op1];
                            let b = this.barrelShifter(inst, newRegisters[inst.op2]);

                            this.logical(inst, a, b);
                        }
                    }
                    break;
                case "cpj":
                    if (typeof inst.op2 !== 'undefined') {
                        let b = this.barrelShifter(inst, newRegisters[inst.op2]);

                        inst.result = this.copyShiftJump(inst, b);
                    }

            }

            // update registers
            if (typeof inst.result !== 'undefined' && typeof inst.op1 !== 'undefined') {
                newRegisters[inst.op1] = this.setTo32Bit(inst.result);
                newRegisters[15]+=4;
                this.cpu.setState({ registers: newRegisters });
            }
            if (inst.updateStatusRegisters) {
                this.cpu.setState({ statusRegister: this.cpu.state.statusRegister });
            }
        }
        else {
            let message = "\n<" + new Date().toLocaleTimeString() + "> Instructions finished!";
            let newTerminal = this.cpu.state.terminal + message;
            this.cpu.setState({ terminal: newTerminal })
        }
    }

    arithmetic(inst: Instruction, a: number, b: number, x?: number): number | undefined {
        let y = undefined;
        let isArithmetic = true;

        switch (inst.instruction) {
            case "ADD": y = (a + b); break;
            case "ADC": y = (a + b + this.cpu.state.statusRegister.getC()); break;
            case "SUB": y = (a + (~b + 1)); break;
            case "SBC": y = (a + (~b + 1) + this.cpu.state.statusRegister.getC() - 1); break;
            case "RSB": y = (b + (~a + 1)); break;
            case "RSC": y = (b + (~a + 1) + this.cpu.state.statusRegister.getC() - 1); break;
            case "MUL": y = (a * b); isArithmetic = false; break;
            case "MLA": y = ((typeof x !== 'undefined') ? (a * b) + x : undefined); isArithmetic = false;
        }

        if (inst.updateStatusRegisters && typeof y !== 'undefined') {
            this.cpu.state.statusRegister.updateFlags(isArithmetic, y, a, b);
        }

        return y;
    }

    logical(inst: Instruction, a: number, b: number,): number | undefined {
        let y = undefined;
        let isArithmetic = false;

        switch (inst.instruction) {
            case "AND": y = (a & b); break;
            case "ORR": y = (a | b); break;
            case "TEQ": y = (a ^ b); break;
            case "BIC": y = (a & (~b)); break;
            case "CMP": y = (a + (~b + 1)); isArithmetic = true; inst.updateStatusRegisters = true; break;
            case "CMN": y = (a + b); isArithmetic = true; inst.updateStatusRegisters = true; break;
            case "TST": y = (a & b); inst.updateStatusRegisters = true; break;
            case "EOR": y = (a ^ b); inst.updateStatusRegisters = true;
        }

        if (inst.updateStatusRegisters && typeof y !== 'undefined') {
            this.cpu.state.statusRegister.updateFlags(isArithmetic, y, a, b);
        }

        return y;
    }

    copyShiftJump(inst: Instruction, b: number): number | undefined {
        let y = undefined;

        switch (inst.instruction) {
            case "MOV": break;
            case "MVN":
        }

        return y;
    }

    barrelShifter(inst: Instruction, x: number): number {
        let y = x;

        if (typeof inst.shift === 'string') {
            let shiftType = inst.shift.substr(0, 3)
            let temp = parseInt(inst.shift.substr(5));
            if (temp === 0) {
                return y;
            }

            let shiftAmount = inst.shift.substr(4, 1) === "#" ? temp : this.cpu.state.registers[temp];
            let carry;

            switch (shiftType) {
                case "LSL":
                case "ASL":
                    y = x << shiftAmount;
                    carry = (x << (shiftAmount - 1)) & 0x80000000;
                    break;
                case "LSR":
                    y = x >>> shiftAmount;
                    carry = (x >>> (shiftAmount - 1)) & 1;
                    break;
                case "ASR":
                    y = x >> shiftAmount;
                    carry = (x >> (shiftAmount - 1)) & 1;
                    break;
                case "ROR":
                    y = (x >>> shiftAmount) | (x << (32 - shiftAmount));
                    carry = (x >>> (shiftAmount - 1)) & 1;
                    break;
                case "RRX":
                    y = (x >>> shiftAmount) | (x << (32 - shiftAmount + 1));
                    y |= (this.cpu.state.statusRegister.getC() << (32 - shiftAmount));
                    carry = (x >>> (shiftAmount - 1)) & 1;
                    break;
            }
            
            if (typeof this.currentInstruction !== 'undefined' && this.currentInstruction.updateStatusRegisters) {
                this.cpu.state.statusRegister.setC(carry === 0 ? 0 : 1);
            }
        }

        return y;
    }

    setTo32Bit(x: number): number {
        return x >>> 0;
    }
}