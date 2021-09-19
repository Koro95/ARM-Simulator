import { RegisterOperand, ImmediateOperand, ShifterOperand, BranchOperand, LoadStoreOperand, LoadImmediateOperand, LoadStoreMultipleOperand } from './Operands'

export {
    Instruction, ArithmeticInstruction, MultiplicationInstruction, LogicInstruction, CopyInstruction,
    JumpInstruction, LoadStoreInstruction, LoadStoreMultipleInstruction, SoftwareInterrupt
}

class Instruction {
    private instruction: string;
    private condition: string;
    private updateStatusRegister: boolean;

    constructor(instruction: string,
        condition: string,
        updateStatusRegister: boolean) {
        this.instruction = instruction;
        this.condition = condition;
        this.updateStatusRegister = updateStatusRegister;
    }

    getInstruction() { return this.instruction; }
    getCondition() { return this.condition; }
    getUpdateStatusRegister() { return this.updateStatusRegister; }

    toString() {
        let string = this.instruction + this.condition;
        if (!["cmp", "cmn", "tst", "teq"].includes(this.instruction)) { string += this.updateStatusRegister ? "s" : ""; }
        return string;
    }
}

class ArithmeticInstruction extends Instruction {
    private op1: RegisterOperand;
    private op2: RegisterOperand | ImmediateOperand | ShifterOperand;
    private op3: RegisterOperand | ImmediateOperand | ShifterOperand | undefined;

    constructor(instruction: string,
        condition: string,
        op1: RegisterOperand,
        op2: RegisterOperand | ImmediateOperand | ShifterOperand,
        op3: RegisterOperand | ImmediateOperand | ShifterOperand | undefined,
        updateStatusRegister: boolean) {
        super(instruction, condition, updateStatusRegister);
        this.op1 = op1;
        this.op2 = op2;
        this.op3 = op3;
    }

    getOp1() { return this.op1; }
    getOp2() { return this.op2; }
    getOp3() { return this.op3; }

    toString() {
        let string = super.toString();
        string += " " + this.op1.toString();
        string += ", " + this.op2.toString();
        if (typeof this.op3 !== 'undefined') { string += ", " + this.op3.toString() };

        return string;
    }
}

class MultiplicationInstruction extends Instruction {
    private op1: RegisterOperand;
    private op2: RegisterOperand;
    private op3: RegisterOperand;
    private op4: RegisterOperand | undefined;

    constructor(instruction: string,
        condition: string,
        op1: RegisterOperand,
        op2: RegisterOperand,
        op3: RegisterOperand,
        op4: RegisterOperand | undefined,
        updateStatusRegister: boolean) {
        super(instruction, condition, updateStatusRegister);
        this.op1 = op1;
        this.op2 = op2;
        this.op3 = op3;
        this.op4 = op4;
    }

    getOp1() { return this.op1; }
    getOp2() { return this.op2; }
    getOp3() { return this.op3; }
    getOp4() { return this.op4; }

    toString() {
        let string = super.toString();
        string += " " + this.op1.toString();
        string += ", " + this.op2.toString();
        string += ", " + this.op3.toString();
        if (typeof this.op4 !== 'undefined') { string += ", " + this.op4.toString() };

        return string;
    }
}

class LogicInstruction extends Instruction {
    private op1: RegisterOperand;
    private op2: RegisterOperand | ImmediateOperand | ShifterOperand;
    private op3: RegisterOperand | ImmediateOperand | ShifterOperand | undefined;

    constructor(instruction: string,
        condition: string,
        op1: RegisterOperand,
        op2: RegisterOperand | ImmediateOperand | ShifterOperand,
        op3: RegisterOperand | ImmediateOperand | ShifterOperand | undefined,
        updateStatusRegister: boolean) {
        super(instruction, condition, updateStatusRegister);
        this.op1 = op1;
        this.op2 = op2;
        this.op3 = op3;
    }

    getOp1() { return this.op1; }
    getOp2() { return this.op2; }
    getOp3() { return this.op3; }

    toString() {
        let string = super.toString();
        string += " " + this.op1.toString();
        string += ", " + this.op2.toString();
        if (typeof this.op3 !== 'undefined') { string += ", " + this.op3.toString() };

        return string;
    }
}

class CopyInstruction extends Instruction {
    private op1: RegisterOperand;
    private op2: RegisterOperand | ImmediateOperand | ShifterOperand;

    constructor(instruction: string,
        condition: string,
        op1: RegisterOperand,
        op2: RegisterOperand | ImmediateOperand | ShifterOperand,
        updateStatusRegister: boolean) {
        super(instruction, condition, updateStatusRegister);
        this.op1 = op1;
        this.op2 = op2;
    }

    getOp1() { return this.op1; }
    getOp2() { return this.op2; }

    toString() {
        let string = super.toString();
        string += " " + this.op1.toString();
        string += ", " + this.op2.toString();

        return string;
    }
}

class JumpInstruction extends Instruction {
    private op1: BranchOperand;

    constructor(instruction: string,
        condition: string,
        op1: BranchOperand,
        updateStatusRegister: boolean) {
        super(instruction, condition, updateStatusRegister);
        this.op1 = op1;
    }

    getOp1() { return this.op1; }

    toString() {
        let string = super.toString();
        string += " " + this.op1.toString();

        return string;
    }
}

class LoadStoreInstruction extends Instruction {
    private format: string;
    private op1: RegisterOperand;
    private op2: LoadStoreOperand | LoadImmediateOperand;

    constructor(instruction: string,
        format: string,
        condition: string,
        op1: RegisterOperand,
        op2: LoadStoreOperand | LoadImmediateOperand,
        updateStatusRegister: boolean) {
        super(instruction, condition, updateStatusRegister);
        this.format = format;
        this.op1 = op1;
        this.op2 = op2;
    }

    getOp1() { return this.op1; }
    getOp2() { return this.op2; }
    getFormat() { return this.format }

    toString() {
        let string = this.getInstruction() + this.getFormat() + this.getCondition();
        string += " " + this.op1.toString();
        string += ", " + this.op2.toString();

        return string;
    }
}

class LoadStoreMultipleInstruction extends Instruction {
    private op1: RegisterOperand;
    private op2: LoadStoreMultipleOperand;
    private addressingMode: string;
    private increment: boolean;

    constructor(instruction: string,
        condition: string,
        op1: RegisterOperand,
        op2: LoadStoreMultipleOperand,
        addressingMode: string,
        increment: boolean,
        updateStatusRegister: boolean) {
        super(instruction, condition, updateStatusRegister);
        this.op1 = op1;
        this.op2 = op2;
        this.addressingMode = addressingMode;
        this.increment = increment;
    }

    getOp1() { return this.op1; }
    getOp2() { return this.op2; }
    getAddressingMode() { return this.addressingMode; }
    getIncrement() { return this.increment; }

    toString() {
        let string = this.getInstruction() + this.addressingMode + this.getCondition();

        string += " " + this.op1.toString();
        if (this.increment) { string += "!"; }
        string += ", " + this.op2.toString();
        
        return string;
    }
}

class SoftwareInterrupt extends Instruction {
    constructor(instruction: string,
        condition: string,
        updateStatusRegister: boolean) {
        super(instruction, condition, updateStatusRegister);
    }

    toString() {
        return super.toString() + " #0"
    }
}