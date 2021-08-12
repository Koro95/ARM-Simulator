export { Instruction, RegisterOperand, ImmediateOperand, ShiftOperand}

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

class RegisterOperand {
    index: number;

    constructor(index: number) {
        this.index = index;
    }

    getIndex() {
        return this.index;
    }
}

class ImmediateOperand {
    value: number;

    constructor(value: number) {
        this.value = value;
    }

    getValue() {
        return this.value;
    }
}

class ShiftOperand {
    operand: RegisterOperand | ImmediateOperand;
    type: string;
    amount: number;

    constructor(operand: RegisterOperand | ImmediateOperand, type: string, amount: number) {
        this.operand = operand;
        this.type = type;
        this.amount = amount;
    }

    getOperand() {
        return this.operand;
    }

    getType() {
        return this.type;
    }

    getAmount() {
        return this.amount;
    }
} 