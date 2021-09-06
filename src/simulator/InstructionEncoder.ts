import { MainMemory } from "./MainMemory";
import { Instruction, ArithmeticInstruction, LogicInstruction, CopyJumpInstruction, RegisterOperand, ImmediateOperand, ShiftOperand, BranchOperand } from "./InstructionsAndOperands";


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

        if (inst instanceof ArithmeticInstruction) {
            encoding += this.toEncodingArithmeticInstruction(inst);
        }
        else if (inst instanceof LogicInstruction) {
            encoding += this.toEncodingLogicInstruction(inst);
        }
        else if (inst instanceof CopyJumpInstruction) {
            encoding += this.toEncodingCopyJumpInstruction(inst, currentAddress);
        }

        return parseInt(encoding, 2).toString(16).padStart(8, "0");
    }

    toEncodingArithmeticInstruction(inst: ArithmeticInstruction): string {
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

        if (["mla", "mul"].includes(inst.getInstruction())) {
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
            else if (shifterOperand instanceof ShiftOperand) {
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
            else if (shifterOperand instanceof ShiftOperand) {
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
            else if (shifterOperand instanceof ShiftOperand) {
                encoding += shifterOperand.toEncoding();
            }
        }

        return encoding;
    }

    toEncodingCopyJumpInstruction(inst: CopyJumpInstruction, currentAddress: number): string {
        let encoding = "";

        if (["mov", "mvn"].includes(inst.getInstruction())) {
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
            else if (shifterOperand instanceof ShiftOperand) {
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