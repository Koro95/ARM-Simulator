export { Instruction }

class Instruction {
    instruction: string;
    type: string;
    op1: string | undefined;
    op2: string | undefined;
    op3: string | undefined;
    op4: string | undefined;
    shift: string | undefined;
    result: number | undefined;
    updateStatusRegisters: boolean;

    constructor(instruction: string, type: string, op1: string | undefined, op2: string | undefined,
        op3: string | undefined, op4: string | undefined, shift: string | undefined) {
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
}