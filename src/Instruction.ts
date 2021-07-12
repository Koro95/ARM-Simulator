import { CodeExecutionEngine } from "./CodeExecutionEngine";

export { Instruction }

class Instruction {
    codeExecutionEngine: CodeExecutionEngine;
    instruction: string;
    type: string;
    op1: number | undefined;
    op2: number | undefined;
    op3: number | undefined;
    op4: number | undefined;
    shift: string | undefined;
    result: number | undefined;
    updateStatusRegisters: boolean;

    constructor(codeExecutionEngine: CodeExecutionEngine, instruction: string, type: string, op1: number | undefined, op2: number | undefined,
        op3: number | undefined, op4: number | undefined, shift: string | undefined) {
        this.codeExecutionEngine = codeExecutionEngine;
        this.instruction = instruction;
        this.type = type;
        this.op1 = op1;
        this.op2 = op2;
        this.op3 = op3;
        this.op4 = op4;
        this.shift = shift;
        this.updateStatusRegisters = false;
        this.result = undefined;
    }

    executeInstruction() {
        let newRegisters = [...this.codeExecutionEngine.cpu.state.registers];

        switch (this.type) {
            case "art":
                if (typeof this.op2 !== 'undefined' && typeof this.op3 !== 'undefined') {
                    let a = newRegisters[this.op2];
                    let b = this.barrelShifter(newRegisters[this.op3]);
                    let x = (typeof this.op4 !== 'undefined') ? newRegisters[this.op4] : this.op4;

                    this.result = this.arithmetic(a, b, x);
                }
                break;
            case "log":
                if (typeof this.op1 !== 'undefined' && typeof this.op2 !== 'undefined') {
                    // AND, ORR, EOR, BIC have 3 operands and need result to update
                    if (typeof this.op3 !== 'undefined') {
                        let a = newRegisters[this.op2];
                        let b = this.barrelShifter(newRegisters[this.op3]);

                        this.result = this.logical(a, b);
                    }
                    // CMP, CMN, TST, TEQ have 2 operands and don't need the result
                    else {
                        let a = newRegisters[this.op1];
                        let b = this.barrelShifter(newRegisters[this.op2]);

                        this.logical(a, b);
                    }
                }
                break;
            case "cpj":
                if (typeof this.op2 !== 'undefined') {
                    let b = this.barrelShifter(newRegisters[this.op2]);

                    this.result = this.copyShiftJump(b);
                }

        }

        // update registers
        if (typeof this.result !== 'undefined' && typeof this.op1 !== 'undefined') {
            newRegisters[this.op1] = this.setTo32Bit(this.result);
            this.codeExecutionEngine.cpu.setState({ registers: newRegisters });
        }
        if (this.updateStatusRegisters) {
            this.codeExecutionEngine.cpu.setState({ statusRegister: this.codeExecutionEngine.cpu.state.statusRegister });
        }
    }

    arithmetic(a: number, b: number, x?: number): number | undefined {
        let y = undefined;
        let isArithmetic = true;

        switch (this.instruction) {
            case "ADD": y = (a + b); break;
            case "ADC": y = (a + b + this.codeExecutionEngine.cpu.state.statusRegister.getC()); break;
            case "SUB": y = (a + (~b + 1)); break;
            case "SBC": y = (a + (~b + 1) + this.codeExecutionEngine.cpu.state.statusRegister.getC() - 1); break;
            case "RSB": y = (b + (~a + 1)); break;
            case "RSC": y = (b + (~a + 1) + this.codeExecutionEngine.cpu.state.statusRegister.getC() - 1); break;
            case "MUL": y = (a * b); isArithmetic = false; break;
            case "MLA": y = ((typeof x !== 'undefined') ? (a * b) + x : undefined); isArithmetic = false;
        }

        if (this.updateStatusRegisters && typeof y !== 'undefined') {
            this.codeExecutionEngine.cpu.state.statusRegister.updateFlags(isArithmetic, y, a, b);
        }

        return y;
    }

    logical(a: number, b: number): number | undefined {
        let y = undefined;
        let isArithmetic = false;

        switch (this.instruction) {
            case "AND": y = (a & b); break;
            case "ORR": y = (a | b); break;
            case "TEQ": y = (a ^ b); break;
            case "BIC": y = (a & (~b)); break;
            case "CMP": y = (a + (~b + 1)); isArithmetic = true; this.updateStatusRegisters = true; break;
            case "CMN": y = (a + b); isArithmetic = true; this.updateStatusRegisters = true; break;
            case "TST": y = (a & b); this.updateStatusRegisters = true; break;
            case "EOR": y = (a ^ b); this.updateStatusRegisters = true;
        }

        if (this.updateStatusRegisters && typeof y !== 'undefined') {
            this.codeExecutionEngine.cpu.state.statusRegister.updateFlags(isArithmetic, y, a, b);
        }

        return y;
    }

    copyShiftJump(b: number): number | undefined {
        let y = undefined;

        switch (this.instruction) {
            case "MOV": break;
            case "MVN":
        }

        return y;
    }

    barrelShifter(x: number): number {
        let y = x;

        if (typeof this.shift === 'string') {
            let shiftType = this.shift.substr(0, 3)
            let temp = parseInt(this.shift.substr(5));
            if (temp === 0) {
                return y;
            }

            let shiftAmount = this.shift.substr(4, 1) === "#" ? temp : this.codeExecutionEngine.cpu.state.registers[temp];
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
                    y |= (this.codeExecutionEngine.cpu.state.statusRegister.getC() << (32 - shiftAmount));
                    carry = (x >>> (shiftAmount - 1)) & 1;
                    break;
            }

            this.codeExecutionEngine.cpu.state.statusRegister.setC(carry === 0 ? 0 : 1);
            this.updateStatusRegisters = true;
        }

        return y;
    }

    setTo32Bit(x: number): number {
        return x >>> 0;
    }
}