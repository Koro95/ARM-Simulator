import { MainMemory } from "./MainMemory";
import { Instruction, ArithmeticInstruction, MultiplicationInstruction, LogicInstruction, CopyInstruction, JumpInstruction, LoadStoreInstruction, SoftwareInterrupt, LoadStoreMultipleInstruction, SwapInstruction } from "./Instructions";
import { RegisterOperand, ImmediateOperand, ShifterOperand, BranchOperand, LoadStoreOperand } from './Operands';

export { InstructionEncoder }

/*
    Class that turns an instruction into its encoding to be displayed in the main memory.
    Is an extra class, instead of an toEndocing() method in Instructions.ts, to keep that
    class cleaner and because some instruction (B, BL) need extra parameters to calculate
    the encoding.

    mainMemory: MainMemory
        MainMemory class, the instruction encoder is attached to.
*/
class InstructionEncoder {
    private mainMemory: MainMemory;

    constructor(mainMemory: MainMemory) {
        this.mainMemory = mainMemory;
    }

    /*
        Function that calls the correct method to encode a instruction of a specific type.

        inst: Instruction
            Instruction to be encoded
        currentAddress: number
            Address in memory of the instruction, needed for CopyInstructions

        return: string
            String of the hex value of the encoding
    */
    toEncoding(inst: Instruction, currentAddress: number): string {
        // first encode the condition
        let encoding = "";
        encoding += ConditionEncoding.get(inst.getCondition());

        // then encode the rest of the instruction based in its type
        if (inst instanceof ArithmeticInstruction) {
            encoding += this.toEncodingArithmeticInstruction(inst);
        }
        else if (inst instanceof MultiplicationInstruction) {
            encoding += this.toEncodingMultiplicationInstruction(inst);
        }
        else if (inst instanceof LogicInstruction) {
            encoding += this.toEncodingLogicInstruction(inst);
        }
        else if (inst instanceof CopyInstruction) {
            encoding += this.toEncodingCopyInstruction(inst);
        }
        else if (inst instanceof JumpInstruction) {
            encoding += this.toEncodingJumpInstruction(inst, currentAddress);
        }
        else if (inst instanceof LoadStoreInstruction) {
            encoding += this.toEncodingLoadStoreInstruction(inst);
        }
        else if (inst instanceof SwapInstruction) {
            encoding += this.toEncodingSwapInstruction(inst);
        }
        else if (inst instanceof LoadStoreMultipleInstruction) {
            encoding += this.toEncodingLoadStoreMultipleInstruction(inst);
        }
        else if (inst instanceof SoftwareInterrupt) {
            encoding += "1111000000000000000000000000"
        }

        // and return the hex string of the encoding
        return parseInt(encoding, 2).toString(16).padStart(8, "0");
    }

    /*
        Function to encode arithmetic instructions

        inst: ArithmeticInstruction
            ArithmeticInstruction to encode

        return: string
             String of the encoding
    */
    toEncodingArithmeticInstruction(inst: ArithmeticInstruction): string {
        // Rules for encoding data-processing instructions:
        // ARM Reference Manual (Issue I - 2005), Section A5.1 Addressing Mode 1 - Data-processing operands
        let encoding = "00"

        // if op3 undefined, op1 used for first two operands and op2 for third operand
        let shifterOperand = inst.getOp3();
        if (typeof shifterOperand === 'undefined') { shifterOperand = inst.getOp2() }
        shifterOperand instanceof ImmediateOperand ? encoding += "1" : encoding += "0";

        encoding += InstructionEncoding.get(inst.getInstruction());
        inst.getUpdateStatusRegister() ? encoding += "1" : encoding += "0";

        // first two operands
        let op1 = inst.getOp1();
        let op2 = inst.getOp2();

        if (typeof op1 !== 'undefined' && op1 instanceof RegisterOperand) {
            // op2 comes first in encoding, if op3 undefined, simply add encoding of op1...
            if (typeof inst.getOp3() === 'undefined') {
                encoding += op1.toEncoding();
            }
            // ...else add encoding of op1
            else if (typeof op2 !== 'undefined' && op2 instanceof RegisterOperand) {
                encoding += op2.toEncoding();
            }
            // followed by encoding of op1
            encoding += op1.toEncoding();
        }

        // add encoding of shifter operand depending on type
        if (shifterOperand instanceof RegisterOperand) {
            encoding += shifterOperand.toEncoding().padStart(12, "0");
        }
        else if (shifterOperand instanceof ImmediateOperand) {
            encoding += shifterOperand.toEncoding();
        }
        else if (shifterOperand instanceof ShifterOperand) {
            encoding += shifterOperand.toEncoding();
        }

        return encoding;
    }

    /*
        Function to encode multiplication instructions

        inst: MultiplicationInstruction
            MultiplicationInstruction to encode

        return: string
             String of the encoding
    */
    toEncodingMultiplicationInstruction(inst: MultiplicationInstruction): string {
        // Rules for encoding multiplication instructions:
        //
        // ARM Reference Manual (Issue I - 2005), Section A4.1.34 MLA
        // ARM Reference Manual (Issue I - 2005), Section A4.1.40 MUL
        let encoding = "000"

        encoding += InstructionEncoding.get(inst.getInstruction());
        inst.getUpdateStatusRegister() ? encoding += "1" : encoding += "0";

        // add encoding of op1, op4, op3 or "0000" if op4 undefined in MUL
        let operands = [inst.getOp1(), inst.getOp4(), inst.getOp3()]
        operands.forEach(op => {
            if (op instanceof RegisterOperand) {
                encoding += op.toEncoding();
            }
            else {
                encoding += "0000";
            }
        })

        // same for both instruction
        encoding += "1001";

        // add encoding of op2
        let op = inst.getOp2();
        if (op instanceof RegisterOperand) {
            encoding += op.toEncoding();
        }

        return encoding;
    }

    /*
        Function to encode logic instructions

        inst: LogicInstruction
            LogicInstruction to encode

        return: string
            String of the encoding
    */
    toEncodingLogicInstruction(inst: LogicInstruction): string {
        // Rules for encoding data-processing instructions:
        // ARM Reference Manual (Issue I - 2005), Section A5.1 Addressing Mode 1 - Data-processing operands
        let encoding = "00"

        // if op3 undefined, op1 used for first two operands and op2 for third operand
        let shifterOperand = inst.getOp3();
        if (typeof shifterOperand === 'undefined') { shifterOperand = inst.getOp2() }
        shifterOperand instanceof ImmediateOperand ? encoding += "1" : encoding += "0";

        encoding += InstructionEncoding.get(inst.getInstruction());
        inst.getUpdateStatusRegister() ? encoding += "1" : encoding += "0";

        let op1 = inst.getOp1();
        let op2 = inst.getOp2();

        // first two operands
        if (typeof op1 !== 'undefined' && op1 instanceof RegisterOperand) {
            // case for 2 operands
            if (typeof inst.getOp3() === 'undefined') {
                encoding += op1.toEncoding();
            }
            // case fir 3 operands
            else if (typeof op2 !== 'undefined' && op2 instanceof RegisterOperand) {
                encoding += op2.toEncoding();
            }

            // case for instructions with 3 operands
            if (["and", "bic", "eor", "orr"].includes(inst.getInstruction())) {
                encoding += op1.toEncoding();
            }
            // case for compare instructions
            else {
                encoding += "0000"
            }
        }

        //shifter operand
        if (typeof shifterOperand === 'undefined') { shifterOperand = op2; }

        if (shifterOperand instanceof RegisterOperand) {
            encoding += shifterOperand.toEncoding().padStart(12, "0");
        }
        else if (shifterOperand instanceof ImmediateOperand) {
            encoding += shifterOperand.toEncoding();
        }
        else if (shifterOperand instanceof ShifterOperand) {
            encoding += shifterOperand.toEncoding();
        }

        return encoding;
    }

    /*
        Function to encode copy instructions

        inst: CopyInstruction
            CopyInstruction to encode

        return: string
            String of the encoding
    */
    toEncodingCopyInstruction(inst: CopyInstruction): string {
        // Rules for encoding copy instructions:
        //
        // ARM Reference Manual (Issue I - 2005), Section A4.1.35 MOV
        // ARM Reference Manual (Issue I - 2005), Section A4.1.41 MVN
        let encoding = "00";

        let op1 = inst.getOp1();
        let shifterOperand = inst.getOp2();

        shifterOperand instanceof ImmediateOperand ? encoding += "1" : encoding += "0";
        encoding += InstructionEncoding.get(inst.getInstruction());
        inst.getUpdateStatusRegister() ? encoding += "1" : encoding += "0";

        encoding += "0000"

        // first operand
        if (typeof op1 !== 'undefined' && op1 instanceof RegisterOperand) {
            encoding += op1.toEncoding();
        }

        //shifter operand
        if (shifterOperand instanceof RegisterOperand) {
            encoding += shifterOperand.toEncoding().padStart(12, "0");
        }
        else if (shifterOperand instanceof ImmediateOperand) {
            encoding += shifterOperand.toEncoding();
        }
        else if (shifterOperand instanceof ShifterOperand) {
            encoding += shifterOperand.toEncoding();
        }

        return encoding;
    }

    /*
        Function to encode jump instructions

        inst: JumpInstruction
            JumpInstruction to encode
        currentAddress: number
            Address of current instruction in the main memory

        return: string
            String of the encoding
    */
    toEncodingJumpInstruction(inst: JumpInstruction, currentAddress: number): string {
        // Rules for encoding jump instructions:
        // ARM Reference Manual (Issue I - 2005), Section A4.1.5 B, BL
        let encoding = "";

        encoding += "101";

        inst.getInstruction().length === 1 ? encoding += "0" : encoding += "1";

        let op1 = inst.getOp1();

        if (op1 instanceof BranchOperand) {
            let address = this.mainMemory.getLabelToAddress().get(op1.toString());

            // calculate target address according to above section in the reference manual
            if (typeof address != 'undefined') {
                let byteOffset = address - (currentAddress + 8);
                encoding += ((byteOffset << 6) >>> 0).toString(2).padStart(32, "0").substring(0, 24);
            }
        }

        return encoding;
    }

    /*
        Function to encode load/store instructions

        inst: LoadStoreInstruction
            LoadStoreInstruction to encode

        return: string
            String of the encoding
    */
    toEncodingLoadStoreInstruction(inst: LoadStoreInstruction): string {
        // Rules for encoding jump instructions:
        //
        // ARM Reference Manual (Issue I - 2005), Section A5.2 Addressing Mode 2 - Load and Store Word or Unsigned Byte
        // ARM Reference Manual (Issue I - 2005), Section A5.3 Addressing Mode 3 - Miscellaneous Loads and Stores

        let encoding = "";
        let op1 = inst.getOp1()
        let op2 = inst.getOp2();
        let format = inst.getFormat();

        if (op2 instanceof LoadStoreOperand) {
            // first 3 bits depending on format
            switch (format) {
                case "": case "b":
                    encoding += "01";

                    if (op2.getOffset() instanceof ImmediateOperand) {
                        encoding += "0";
                    }
                    else {
                        encoding += "1";
                    }
                    break;
                case "h": case "sb": case "sh":
                    encoding += "000";
                    break;
            }

            // P bit
            op2.getPreIndexed() ? encoding += "1" : encoding += "0";
            // U bit
            op2.getIncrement() ? encoding += "1" : encoding += "0";

            // B bit depending on format
            switch (format) {
                case "": encoding += "0"; break;
                case "b": encoding += "1"; break;
                case "h": case "sb": case "sh":
                    if (op2.getOffset() instanceof ImmediateOperand) {
                        encoding += "1";
                    }
                    else {
                        encoding += "0";
                    }
                    break;
            }

            // W bit
            if (op2.getPreIndexed()) {
                op2.getIncrement() ? encoding += "1" : encoding += "0";
            }
            else {
                encoding += "0";
            }

            // L bit
            switch (inst.getInstruction()) {
                case "ldr": encoding += "1"; break;
                case "str": encoding += "0"; break;
            }

            // encoding of the two registers
            encoding += op2.getRegister().toEncoding();
            encoding += op1.toEncoding();

            // encoding of the offset operand depending on format
            let offset = op2.getOffset();
            switch (format) {
                case "": case "b":
                    if (offset !== undefined) {
                        encoding += offset.toEncoding().padStart(12, "0")
                    }
                    else {
                        encoding += "000000000000"
                    }
                    break;
                case "h": case "sb": case "sh":
                    if (offset instanceof ImmediateOperand) {
                        let immediate = offset.getValue().toString(2).padStart(8, "0");

                        encoding += immediate.substring(0, 4)

                        encoding += "10";
                        if (format === "h" || format === "sh") {
                            encoding += "1";
                        }
                        else {
                            encoding += "0";
                        }
                        encoding += "1";

                        encoding += immediate.substring(4)
                    }
                    else {
                        encoding += "0000";
                        encoding += "10";
                        if (format === "h" || format === "sh") {
                            encoding += "1";
                        }
                        else {
                            encoding += "0";
                        }
                        encoding += "1";
                        if (offset !== undefined) {
                            encoding += offset.toEncoding();
                        }
                        else {
                            encoding += "0000";
                        }
                    }
                    break;
            }
        }
        // ldr r0, =label unkown encoding -> didn't find anything in ARM reference manual
        else {
            encoding += "0000000000000000000000000000"
        }

        return encoding;
    }

    /*
        Function to encode swap instructions

        inst: SwapInstruction
            SwapInstruction to encode

        return: string
            String of the encoding
    */
    toEncodingSwapInstruction(inst: SwapInstruction): string {
        // Rules for encoding jump instructions:
        //
        // ARM Reference Manual (Issue I - 2005), Section A4.1.108 SWP
        // ARM Reference Manual (Issue I - 2005), Section A4.1.109 SWPB
        let encoding = "00010";

        switch (inst.getFormat()) {
            case "": encoding += "000"; break;
            case "b": encoding += "100"; break;
        }

        encoding += inst.getOp3().toEncoding();
        encoding += inst.getOp1().toEncoding();

        encoding += "00001001"

        encoding += inst.getOp2().toEncoding();

        return encoding;
    }

    /*
        Function to encode load/store multiple instructions

        inst: LoadStoreMultipleInstruction
            LoadStoreMultipleInstruction to encode

        return: string
            String of the encoding
    */
    toEncodingLoadStoreMultipleInstruction(inst: LoadStoreMultipleInstruction): string {
        // Rules for encoding jump instructions:
        // ARM Reference Manual (Issue I - 2005), Section A5.4 Addressing Mode 4 - Load and Store Multiple
        let encoding = "100";

        let addressingMode = inst.getAddressingMode()
        // fd, fa, ed, ea
        let alternateAddressingMode = AddressingMode.get(inst.getInstruction() + inst.getAddressingMode());
        if (alternateAddressingMode !== undefined) {
            addressingMode = alternateAddressingMode;
        }
        let pu = AddressingModeToIncrement.get(addressingMode);

        // P and U Bit
        if (pu !== undefined) {
            pu[1] ? encoding += "1" : encoding += "0";
            pu[0] ? encoding += "1" : encoding += "0";
        }

        // S bit
        encoding += "0";

        // W bit
        inst.getIncrement() ? encoding += "1" : encoding += "0";

        // L bit
        switch (inst.getInstruction()) {
            case "ldm": encoding += "1"; break;
            case "stm": encoding += "0"; break;
        }

        // encode both operands
        encoding += inst.getOp1().toEncoding();
        encoding += inst.getOp2().toEncoding();

        return encoding;
    }
}

// Encoding of the condition
// ARM Reference Manual (Issue I - 2005), Section A3.2.1 Condition code 0b1111
const ConditionEncoding = new Map([
    ["eq", "0000"],
    ["ne", "0001"],
    ["hs", "0010"],
    ["cs", "0010"],
    ["lo", "0011"],
    ["cc", "0011"],
    ["mi", "0100"],
    ["pl", "0101"],
    ["vs", "0110"],
    ["vc", "0111"],
    ["hi", "1000"],
    ["ls", "1001"],
    ["ge", "1010"],
    ["lt", "1011"],
    ["gt", "1100"],
    ["le", "1101"],
    ["al", "1110"],
    ["", "1110"],
    ["nv", "1111"]
]);

// Encoding of the data-processing instructions
// ARM Reference Manual (Issue I - 2005), Section A3.4 Data-processing instructions
const InstructionEncoding = new Map([
    ["adc", "0101"],
    ["add", "0100"],
    ["mla", "0001"],
    ["mul", "0000"],
    ["rsb", "0011"],
    ["rsc", "0111"],
    ["sbc", "0110"],
    ["sub", "0010"],
    ["and", "0000"],
    ["bic", "1110"],
    ["cmn", "1011"],
    ["cmp", "1010"],
    ["eor", "0001"],
    ["orr", "1100"],
    ["teq", "1001"],
    ["tst", "1000"],
    ["mov", "1101"],
    ["mvn", "1111"]
]);

// Addressing mode to increment/decrement and before/after
export const AddressingModeToIncrement = new Map([
    ["ia", [true, false]],
    ["ib", [true, true]],
    ["da", [false, false]],
    ["db", [false, true]],
]);

// Alternate addressing mode to addressing mode depending on operation
// ARM Reference Manual (Issue I - 2005), Section A5.4.6 Load and Store Multiple addressing modes (alternative names)
export const AddressingMode = new Map([
    ["stmea", "ia"],
    ["ldmfd", "ia"],
    ["stmfa", "ib"],
    ["ldmed", "ib"],
    ["stmed", "da"],
    ["ldmfa", "da"],
    ["stmfd", "db"],
    ["ldmed", "db"]
]);