/*
    File with all different instructions used in the VO/PS.

    Implementation of instructions taken from:
    ARM Reference Manual (Issue I - 2005), Section A4.1 Alphabetical list of ARM instructions
*/

import {
    RegisterOperand, ImmediateOperand, ShifterOperand, BranchOperand,
    LoadStoreOperand, LoadImmediateOperand, LoadStoreMultipleOperand
} from './Operands'

export {
    Instruction, ArithmeticInstruction, MultiplicationInstruction, LogicInstruction, CopyInstruction,
    JumpInstruction, LoadStoreInstruction, SwapInstruction, LoadStoreMultipleInstruction, SoftwareInterrupt
}

/*
    Parent class with field, that all instructions have in common:

    instruction: string
        Name of the instruction
    condition: string
        Condition, under which the instruction should be executed.
        ARM Reference Manual (Issue I - 2005), Section A3.2 The condition field
    updateStatusRegister: boolean
        True, if the statusregister should be updated. S-Bit after the instrcution
        name or always true for compare instructions.
*/
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

/*
    Class for all arithmetic instructions (ADD, ADC, SUB, SBC, RSB, RSC)

    op1: RegisterOperand
        Always a register.
    op2: RegisterOperand | ImmediateOperand | ShifterOperand
        Can be a register, immediate or shifter operand.
    op3: RegisterOperand | ImmediateOperand | ShifterOperand | undefined
        Can be a register, immediate or shifter operand.
        Also can be undefined --> with 2 operands, op1
        takes the place of op1 and op2 and op2 is used
        as op3.
*/
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

/*
    Class for all multiplication instructions (MUL, MLA)

    op1: RegisterOperand
        Only registers allowed for multiplication.
    op2: RegisterOperand
        Only registers allowed for multiplication.
    op3: RegisterOperand
        Only registers allowed for multiplication.
    op4: RegisterOperand | undefined
        Only registers allowed for multiplication.
        Undefined for MUL.

*/
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

/*
    Class for all logic instructions (AND, ORR, EOR, BIC, CMP, CMN, TST, TEQ)

    op1: RegisterOperand
        Always a register.
    op2: RegisterOperand | ImmediateOperand | ShifterOperand
        Can be a register, immediate or shifter operand.
    op3: RegisterOperand | ImmediateOperand | ShifterOperand | undefined
        Can be a register, immediate or shifter operand.
        Also can be undefined --> with 2 operands, op1
        takes the place of op1 and op2 and op2 is used
        as op3.
*/
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

/*
    Class for the copy instructions (MOV, MVN)

    op1: RegisterOperand
        Always a register.
    op2: RegisterOperand | ImmediateOperand | ShifterOperand
        Can be a register, immediate or shifter operand.
*/
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

/*
    Class for the jump instructions (B, BL)

    op1: BranchOperand
        Label to jump to.
*/
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

/*
    Class for all load/store instructions (LDR, STR, LDRB, STRB,
    LDRH, STRH, LDRSB, LDRSH)

    format: string
        Empty, "B", "H", "SB", "SH" depending on the data type
        to be loaded.
    op1: RegisterOperand
        Always a register.
    op2: LoadStoreOperand | LoadImmediateOperand
        Can a LoadStoreOperand or a LoadImmediateOperand, if a
        value is loaded with "LDR rX, =".
*/
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

/*
    Class for all swap instructions (SWP, SWPB)

    format: string
        Empty or "B", depending on the data type
        to be swapped.
    op1: RegisterOperand
        Always a register.
    op2: RegisterOperand 
        Always a register.
    op3: RegisterOperand
        Always a register.
*/
class SwapInstruction extends Instruction {
    private format: string;
    private op1: RegisterOperand;
    private op2: RegisterOperand;
    private op3: RegisterOperand;

    constructor(instruction: string,
        format: string,
        condition: string,
        op1: RegisterOperand,
        op2: RegisterOperand,
        op3: RegisterOperand,
        updateStatusRegister: boolean) {
        super(instruction, condition, updateStatusRegister);
        this.format = format;
        this.op1 = op1;
        this.op2 = op2;
        this.op3 = op3;
    }

    getOp1() { return this.op1; }
    getOp2() { return this.op2; }
    getOp3() { return this.op3; }
    getFormat() { return this.format }

    toString() {
        let string = this.getInstruction() + this.getFormat() + this.getCondition();
        string += " " + this.op1.toString();
        string += ", " + this.op2.toString();
        string += ", [" + this.op3.toString() + "]";

        return string;
    }
}

/*
    Class for all load/store multiple instructions (LDM, STM)

    op1: RegisterOperand
        Always a register.
    op2: LoadStoreMultipleOperand
        Always a LoadStoreMultipleOperand.
    addressingMode: string
        String with the addressing mode:
            ARM Reference Manual (Issue I - 2005), Section A5.4 Addressing Mode 4 - Load and Store Multiple
        or alternative addressing mode:
            ARM Reference Manual (Issue I - 2005), Section A5.4.6 Load and Store Multiple addressing modes (alternative names)
    increment: boolean
        True, if the basis register should be incremented
        after loading/storing.
*/
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


/*
    Class for Software Interrupts (SWI #0)

    Only has toString() method, handling of different
    interrupts in CodeExectionEngine.ts
*/
class SoftwareInterrupt extends Instruction {
    toString() {
        return super.toString() + " #0"
    }
}