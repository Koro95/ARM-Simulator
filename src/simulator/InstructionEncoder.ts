import { MainMemory } from "./MainMemory";
import { Instruction, ArithmeticInstruction, MultiplicationInstruction, LogicInstruction, CopyInstruction, JumpInstruction, LoadStoreInstruction, SoftwareInterrupt, LoadStoreMultipleInstruction, SwapInstruction } from "./Instructions";
import { RegisterOperand, ImmediateOperand, ShifterOperand, BranchOperand, LoadStoreOperand } from './Operands';

export { InstructionEncoder }

class InstructionEncoder {
    mainMemory: MainMemory;

    constructor(mainMemory: MainMemory) {
        this.mainMemory = mainMemory;
    }

    // TODO bit 25=0, 4=1 and 7=1 -> extended instruction
    toEncoding(inst: Instruction, currentAddress: number): string {
        let encoding = "";
        encoding += ConditionEncoding.get(inst.getCondition());

        if (inst instanceof ArithmeticInstruction || inst instanceof MultiplicationInstruction) {
            encoding += this.toEncodingArithmeticInstruction(inst);
        }
        else if (inst instanceof LogicInstruction) {
            encoding += this.toEncodingLogicInstruction(inst);
        }
        else if (inst instanceof CopyInstruction || inst instanceof JumpInstruction) {
            encoding += this.toEncodingCopyJumpInstruction(inst, currentAddress);
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

        return parseInt(encoding, 2).toString(16).padStart(8, "0");
    }

    toEncodingArithmeticInstruction(inst: ArithmeticInstruction | MultiplicationInstruction): string {
        let encoding = "00"

        if (["mla", "mul"].includes(inst.getInstruction())) {
            encoding += "0";
        }
        else {
            // Rules for bit 25 (Immediate bit):
            // ARM Reference Manual (Issue I - 2005), Section A5.1.1 Encoding

            // if op3 undefined, op1 used for first two operands and op2 for third operand
            let op = inst.getOp3();
            if (typeof op === 'undefined') { op = inst.getOp2() }

            op instanceof ImmediateOperand ? encoding += "1" : encoding += "0";
        }

        encoding += InstructionEncoding.get(inst.getInstruction());

        inst.getUpdateStatusRegister() ? encoding += "1" : encoding += "0";

        if (["mla", "mul"].includes(inst.getInstruction()) && inst instanceof MultiplicationInstruction) {
            let operands = [inst.getOp1(), inst.getOp4(), inst.getOp3()]

            operands.forEach(op => {
                if (op instanceof RegisterOperand) {
                    encoding += op.toEncoding();
                }
                else {
                    encoding += "0000";
                }
            })

            encoding += "1001";

            let op = inst.getOp2();
            if (op instanceof RegisterOperand) {
                encoding += op.toEncoding();
            }

        }
        else {
            let op1 = inst.getOp1();
            let op2 = inst.getOp2();
            let shifterOperand = inst.getOp3();

            // first two operands
            if (typeof op1 !== 'undefined' && op1 instanceof RegisterOperand) {
                if (typeof shifterOperand === 'undefined') {
                    encoding += op1.toEncoding();
                }
                else if (typeof op2 !== 'undefined' && op2 instanceof RegisterOperand) {
                    encoding += op2.toEncoding();
                }
                encoding += op1.toEncoding();
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
        }

        return encoding;
    }

    toEncodingLogicInstruction(inst: LogicInstruction): string {
        let encoding = "00"

        // Rules for bit 25 (Immediate bit):
        // ARM Reference Manual (Issue I - 2005), Section A5.1.1 Encoding

        // if op3 undefined, op1 used for first two operands and op2 for third operand
        let op = inst.getOp3();
        if (typeof op === 'undefined') { op = inst.getOp2() }

        op instanceof ImmediateOperand ? encoding += "1" : encoding += "0";

        encoding += InstructionEncoding.get(inst.getInstruction());

        inst.getUpdateStatusRegister() ? encoding += "1" : encoding += "0";

        if (["and", "bic", "eor", "orr"].includes(inst.getInstruction())) {
            let op1 = inst.getOp1();
            let op2 = inst.getOp2();
            let shifterOperand = inst.getOp3();

            // first two operands
            if (typeof op1 !== 'undefined' && op1 instanceof RegisterOperand) {
                if (typeof shifterOperand === 'undefined') {
                    encoding += op1.toEncoding();
                }
                else if (typeof op2 !== 'undefined' && op2 instanceof RegisterOperand) {
                    encoding += op2.toEncoding();
                }
                encoding += op1.toEncoding();
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

        }
        else {
            let op1 = inst.getOp1();
            let shifterOperand = inst.getOp2();

            // first two operands
            if (typeof op1 !== 'undefined' && op1 instanceof RegisterOperand) {
                encoding += op1.toEncoding();
            }

            encoding += "0000"

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
        }

        return encoding;
    }

    toEncodingCopyJumpInstruction(inst: CopyInstruction | JumpInstruction, currentAddress: number): string {
        let encoding = "";

        if (["mov", "mvn"].includes(inst.getInstruction()) && inst instanceof CopyInstruction) {
            encoding += "00"

            // Rules for bit 25 (Immediate bit):
            // ARM Reference Manual (Issue I - 2005), Section A5.1.1 Encoding
            let op1 = inst.getOp1();
            let shifterOperand = inst.getOp2();

            shifterOperand instanceof ImmediateOperand ? encoding += "1" : encoding += "0";

            encoding += InstructionEncoding.get(inst.getInstruction());

            inst.getUpdateStatusRegister() ? encoding += "1" : encoding += "0";

            encoding += "0000"

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
        }
        else {
            encoding += "101";

            inst.getInstruction().length === 1 ? encoding += "0" : encoding += "1";

            let op1 = inst.getOp1();

            if (op1 instanceof BranchOperand) {
                let address = this.mainMemory.labelToAddress.get(op1.toString());
                if (typeof address != 'undefined') {
                    let byteOffset = address - (currentAddress + 8);
                    encoding += ((byteOffset << 6) >>> 0).toString(2).padStart(32, "0").substring(0, 24);
                }
            }
        }

        return encoding;
    }

    toEncodingLoadStoreInstruction(inst: LoadStoreInstruction): string {
        let encoding = "";
        let op1 = inst.getOp1()
        let op2 = inst.getOp2();
        let format = inst.getFormat();

        if (op2 instanceof LoadStoreOperand) {
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

            op2.getPreIndexed() ? encoding += "1" : encoding += "0";
            op2.getIncrement() ? encoding += "1" : encoding += "0";

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

            if (op2.getPreIndexed()) {
                op2.getIncrement() ? encoding += "1" : encoding += "0";
            }
            else {
                encoding += "0";
            }

            switch (inst.getInstruction()) {
                case "ldr": encoding += "1"; break;
                case "str": encoding += "0"; break;
            }

            encoding += op2.getRegister().toEncoding();
            encoding += op1.toEncoding();

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

                        encoding += immediate.substring(0,4)

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
        else {
            // ldr r0, =label unkown encoding -> didn't find anything in ARM reference manual
            encoding += "0000000000000000000000000000"
        }

        console.log(encoding.length)

        return encoding;
    }

    toEncodingSwapInstruction(inst: SwapInstruction): string {
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

    toEncodingLoadStoreMultipleInstruction(inst: LoadStoreMultipleInstruction): string {
        let encoding = "100";

        let addressingMode = inst.getAddressingMode()
        // fd, fa, ed, ea
        let alternateAddressingMode = AddressingMode.get(inst.getInstruction() + inst.getAddressingMode());
        if (alternateAddressingMode !== undefined) {
            addressingMode = alternateAddressingMode;
        }
        let pu = AddressingModeToIncrement.get(addressingMode);

        if (pu !== undefined) {
            pu[1] ? encoding += "1" : encoding += "0";
            pu[0] ? encoding += "1" : encoding += "0";
        }

        encoding += "0";

        inst.getIncrement() ? encoding += "1" : encoding += "0";

        switch (inst.getInstruction()) {
            case "ldm": encoding += "1"; break;
            case "stm": encoding += "0"; break;
        }

        encoding += inst.getOp1().toEncoding();
        encoding += inst.getOp2().toEncoding();

        return encoding;
    }
}

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

export const AddressingModeToIncrement = new Map([
    ["ia", [true, false]],
    ["ib", [true, true]],
    ["da", [false, false]],
    ["db", [false, true]],
]);