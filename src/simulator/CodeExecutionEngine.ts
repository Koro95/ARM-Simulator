import { Cpu, MessageType } from "./Cpu";
import { Instruction, ArithmeticInstruction, LogicInstruction, CopyInstruction, JumpInstruction, LoadStoreInstruction, MultiplicationInstruction, SoftwareInterrupt } from "./Instructions";
import { Operand, RegisterOperand, ImmediateOperand, ShifterOperand, BranchOperand, LoadStoreOperand, LoadImmediateOperand } from './Operands';
import { MainMemory } from "./MainMemory";
import { StatusRegister } from "./StatusRegister";

export { CodeExecutionEngine };

enum DebuggerSpeed {
    Instant = 0,
    Slow = 300,
    Medium = 100,
    Fast = 10
}

class CodeExecutionEngine {
    cpu: Cpu;
    newRegisters: number[];
    newStatusRegister: StatusRegister;
    newMainMemory: MainMemory | undefined;
    currentLine: Instruction | number | undefined;
    debuggerSpeed: DebuggerSpeed;
    stop: boolean;
    breakpoints: Set<number>;

    constructor(cpu: Cpu) {
        this.cpu = cpu;
        this.newRegisters = [];
        this.newStatusRegister = new StatusRegister();
        this.newMainMemory = undefined;
        this.currentLine = undefined;
        this.debuggerSpeed = DebuggerSpeed.Instant;
        this.stop = false;
        this.breakpoints = new Set();
    }

    delay = (ms: number) => new Promise(res => setTimeout(res, ms));

    continue = async () => {
        this.newRegisters = [...this.cpu.state.registers];
        this.newStatusRegister = this.cpu.state.statusRegister;
        this.newMainMemory = this.cpu.state.mainMemory;

        let currentNumInstruction = 0;
        let maxContinueInstructions = 1000;

        do {
            if (currentNumInstruction++ > maxContinueInstructions) {
                this.cpu.newTerminalMessage("Automatic breakpoint after " + maxContinueInstructions + " reached!", MessageType.Error)
                break;
            }
            if (this.debuggerSpeed !== DebuggerSpeed.Instant) {
                await this.delay(this.debuggerSpeed.valueOf())
                this.cpu.setState({ registers: this.newRegisters, statusRegister: this.newStatusRegister, mainMemory: this.newMainMemory });
            }
        } while (this.executeNextInstruction() && !this.stop);

        this.cpu.setState({ registers: this.newRegisters, statusRegister: this.newStatusRegister, mainMemory: this.newMainMemory });
    }

    executeNextInstruction(): boolean {
        let memoryAddress = this.newRegisters[15];

        if (memoryAddress % 4 === 0 && typeof this.newMainMemory !== 'undefined') {
            this.currentLine = this.newMainMemory.getMemoryLine(memoryAddress).getContent();
            let successful = this.executeInstruction();
            if (this.breakpoints.has(this.newRegisters[15])) {
                this.stop = true;
            }
            return successful;
        }
        else {
            this.cpu.newTerminalMessage("Invalid Memory Adress!", MessageType.Error);
            return false;
        }
    }

    executeInstruction(): boolean {
        if (this.currentLine instanceof Instruction) {
            let inst = this.currentLine;

            this.newRegisters[15] += 4;

            let condition = inst.getCondition();
            let flags = this.newStatusRegister.getFlags();

            switch (condition) {
                case "eq": if (flags[1]) { break; } return true;
                case "ne": if (!flags[1]) { break; } return true;
                case "hs": case "cs": if (flags[2]) { break; } return true;
                case "lo": case "cc": if (!flags[2]) { break; } return true;
                case "mi": if (flags[0]) { break; } return true;
                case "pl": if (!flags[0]) { break; } return true;
                case "vs": if (flags[3]) { break; } return true;
                case "vc": if (!flags[3]) { break; } return true;
                case "hi": if (flags[2] * Number(!flags[1])) { break; } return true;
                case "ls": if (Number(!flags[2]) + flags[1]) { break; } return true;
                case "ge": if (flags[0] * flags[3] + Number(!flags[0]) * Number(!flags[3])) { break; } return true;
                case "lt": if (flags[0] * Number(!flags[3]) + Number(!flags[0]) * flags[3]) { break; } return true;
                case "gt": if (Number(!flags[1]) * flags[0] * flags[3] +
                    Number(!flags[1]) * Number(!flags[0]) * Number(!flags[3])) { break; } return true;
                case "le": if (flags[0] * Number(!flags[3]) + flags[1] +
                    Number(!flags[0]) * flags[3]) { break; } return true;
                case "al": break;
                case "nv": return true;
            }

            let result;
            let op1, op2, op3, op4;
            let targetRegister;

            if (inst instanceof ArithmeticInstruction) {
                let x = inst.getOp1();
                if (x instanceof RegisterOperand && typeof x !== 'undefined') { targetRegister = x.getIndex() };
                op1 = this.getOperandValue(inst.getOp1());
                op2 = this.getOperandValue(inst.getOp2());
                op3 = this.getOperandValue(inst.getOp3());
                if (typeof op2 !== 'undefined') {
                    if (typeof op3 !== 'undefined') {
                        result = this.arithmetic(inst, op2, op3, op4);
                    }
                    else if (typeof op1 !== 'undefined') {
                        result = this.arithmetic(inst, op1, op2, op4);
                    }
                }
            }
            if (inst instanceof MultiplicationInstruction) {
                let x = inst.getOp1();
                if (x instanceof RegisterOperand && typeof x !== 'undefined') { targetRegister = x.getIndex() };
                op1 = this.getOperandValue(inst.getOp1());
                op2 = this.getOperandValue(inst.getOp2());
                op3 = this.getOperandValue(inst.getOp3());
                op4 = this.getOperandValue(inst.getOp4());
                if (typeof op2 !== 'undefined') {
                    if (typeof op3 !== 'undefined') {
                        result = this.arithmetic(inst, op2, op3, op4);
                    }
                    else if (typeof op1 !== 'undefined') {
                        result = this.arithmetic(inst, op1, op2, op4);
                    }
                }
            }
            else if (inst instanceof LogicInstruction) {
                let x = inst.getOp1();
                if (x instanceof RegisterOperand && typeof x !== 'undefined') { targetRegister = x.getIndex() };
                op1 = this.getOperandValue(inst.getOp1());
                op2 = this.getOperandValue(inst.getOp2());
                op3 = this.getOperandValue(inst.getOp3());
                if (typeof op2 !== 'undefined') {
                    // AND, ORR, EOR, BIC have 3 operands and need result to update
                    if (typeof op3 !== 'undefined') {
                        result = this.logical(inst, op2, op3);
                    }
                    else if (typeof op1 !== 'undefined') {
                        result = this.logical(inst, op1, op2);
                    }
                }
            }
            else if (inst instanceof CopyInstruction) {
                let x = inst.getOp1();

                targetRegister = x.getIndex()

                op2 = this.getOperandValue(inst.getOp2());
                if (typeof op2 !== 'undefined') {
                    result = this.copy(inst, op2);
                }

                if (targetRegister === 15 && typeof result !== 'undefined') {
                    result += 4;
                }

            }
            else if (inst instanceof JumpInstruction) {
                let x = inst.getOp1();

                let address = this.cpu.state.mainMemory.labelToAddress.get(x.toString());
                this.newRegisters[15] -= 4;

                if (typeof address !== 'undefined') {
                    if (inst.getInstruction() === "bl") {
                        this.newRegisters[14] = this.newRegisters[15]
                    }
                    this.newRegisters[15] = address;
                }
                else {
                    this.cpu.newTerminalMessage("Invalid branch label!", MessageType.Error)
                    return false;
                }

            }
            else if (inst instanceof LoadStoreInstruction) {
                let reg = this.getOperandValue(inst.getOp1());
                let op2 = inst.getOp2();

                if (op2 instanceof LoadStoreOperand) {
                    let loadStoreReg = this.getOperandValue(op2.getRegister());
                    let loadStoreOffset = this.getOperandValue(op2.getOffset());

                    if (reg !== undefined && loadStoreReg !== undefined && this.newMainMemory !== undefined) {
                        if (op2.getNegativeRegOffset() && loadStoreOffset !== undefined) {
                            loadStoreOffset = -loadStoreOffset;
                        }

                        if (op2.getPreIndexed()) {
                            if (loadStoreOffset !== undefined) {
                                loadStoreReg += loadStoreOffset;
                            }
                            if (loadStoreReg % 4 !== 0) {
                                this.cpu.newTerminalMessage(this.cpu.toHex(loadStoreReg) + " not an aligned address!", MessageType.Error)
                                this.newRegisters[15] -= 4;
                                return false;
                            }
                            if (inst.getInstruction() === "str") {
                                this.newMainMemory.addData(loadStoreReg, reg)
                            }
                            else if (inst.getInstruction() === "ldr") {
                                let content = this.newMainMemory.getMemoryLine(loadStoreReg).getContent();
                                if (typeof content === 'number') {
                                    this.newRegisters[inst.getOp1().getIndex()] = content;
                                }
                            }
                        }
                        else {
                            if (loadStoreReg % 4 !== 0) {
                                this.cpu.newTerminalMessage(this.cpu.toHex(loadStoreReg) + " not an aligned address!", MessageType.Error)
                                this.newRegisters[15] -= 4;
                                return false;
                            }
                            if (inst.getInstruction() === "str") {
                                this.newMainMemory.addData(loadStoreReg, reg)
                            }
                            else if (inst.getInstruction() === "ldr") {
                                let content = this.newMainMemory.getMemoryLine(loadStoreReg).getContent();
                                if (typeof content === 'number') {
                                    this.newRegisters[inst.getOp1().getIndex()] = content;
                                }
                            }
                            if (loadStoreOffset !== undefined) {
                                loadStoreReg += loadStoreOffset;
                            }
                        }

                        if (op2.getIncrement()) {
                            this.newRegisters[op2.getRegister().getIndex()] = loadStoreReg;
                        }

                    }
                }
                else if (op2 instanceof LoadImmediateOperand && inst.getInstruction() == "ldr" && this.newMainMemory !== undefined) {
                    let op2Immediate = op2.getImmediate();
                    let content;

                    if (op2Immediate instanceof BranchOperand) {
                        let contentAddress = this.newMainMemory?.labelToAddress.get(op2Immediate.getLabel());
                        if (contentAddress === undefined) {
                            this.cpu.newTerminalMessage("Label \"" + op2Immediate.getLabel() + "\" not found!", MessageType.Error)
                            this.newRegisters[15] -= 4;
                            return false;
                        }
                        else {
                            this.newRegisters[inst.getOp1().getIndex()] = contentAddress;
                        }

                    }
                    else {
                        content = op2Immediate;
                        this.newRegisters[inst.getOp1().getIndex()] = content;
                    }
                }
                else {
                    return false;
                }
            }
            else if (inst instanceof SoftwareInterrupt) {
                this.softwareInterrupt();
            }

            // update registers
            if (typeof result !== 'undefined' && typeof targetRegister !== 'undefined') {
                this.newRegisters[targetRegister] = this.setTo32Bit(result);
            }
            return true;
        }
        else {
            this.cpu.newTerminalMessage("Instructions finished!", MessageType.Warning)
            return false;
        }
    }

    arithmetic(inst: Instruction, a: number, b: number, x?: number): number | undefined {
        let y = undefined;
        let isArithmetic = true;

        switch (inst.getInstruction()) {
            case "add": y = (a + b); break;
            case "adc": y = (a + b + this.newStatusRegister.getC()); break;
            case "sub": b = ~b; y = (a + b + 1); break;
            case "sbc": b = ~b; y = (a + b + 1 + this.newStatusRegister.getC() - 1); break;
            case "rsb": a = ~a; y = (b + a + 1); break;
            case "rsc": a = ~a; y = (b + a + 1 + this.newStatusRegister.getC() - 1); break;
            case "mul": y = (a * b); isArithmetic = false; break;
            case "mla": y = ((typeof x !== 'undefined') ? (a * b) + x : undefined); isArithmetic = false;
        }

        if (inst.getUpdateStatusRegister() && typeof y !== 'undefined') {
            this.newStatusRegister.updateFlags(isArithmetic, y, a, b);
        }

        return y;
    }

    logical(inst: Instruction, a: number, b: number,): number | undefined {
        let y = undefined;
        let isArithmetic = false;
        let updateStatusRegister = inst.getUpdateStatusRegister();
        let resultNeeded = true;

        switch (inst.getInstruction()) {
            case "and": y = (a & b); break;
            case "orr": y = (a | b); break;
            case "teq": y = (a ^ b); break;
            case "bic": b = ~b; y = (a & b); break;
            case "cmp": b = ~b; y = (a + b + 1); isArithmetic = true; resultNeeded = false; break;
            case "cmn": y = (a + b); isArithmetic = true; resultNeeded = false; break;
            case "tst": y = (a & b); resultNeeded = false; break;
            case "eor": y = (a ^ b); resultNeeded = false;
        }

        if (updateStatusRegister && typeof y !== 'undefined') {
            this.newStatusRegister.updateFlags(isArithmetic, y, a, b);
        }

        if (resultNeeded) {
            return y;
        }
        return undefined;
    }

    copy(inst: Instruction, b: number): number | undefined {
        let y = undefined;

        switch (inst.getInstruction()) {
            case "mov": y = b; break;
            case "mvn": y = ~b; break;
        }

        return y;
    }

    loadStore(inst: Instruction,) {

    }

    softwareInterrupt() {
        if (this.newRegisters[0] === 0 && this.newRegisters[7] === 1) {
            this.cpu.newTerminalMessage("Program exited successfully!")
            this.newRegisters[15] -= 4;
            this.stop = true;
        }
        else if (this.newRegisters[0] === 1 && this.newRegisters[7] === 4) {
            let address = this.newRegisters[1];
            let length = this.newRegisters[2];

            let nextLine = address % 4;
            address -= nextLine;

            let output = "";

            for (let x = 0; x < length; x++) {
                let memoryLine =  this.newMainMemory?.getMemoryLine(address).getContent();
                if (typeof memoryLine === 'number') {              
                    output += String.fromCharCode(memoryLine >>> nextLine*8 & 0xff);
                    nextLine++;
                    if (nextLine === 4) {
                        nextLine = 0;
                        address+=4;
                    }
                }

            }

            this.cpu.newTerminalOutput(output);
        }
        else {
            this.cpu.newTerminalMessage("Unkown Software Interrupt!", MessageType.Warning)
        }
    }

    getOperandValue(operand: Operand | undefined): number | undefined {
        if (operand instanceof RegisterOperand) {
            return this.newRegisters[operand.getIndex()];
        }
        else if (operand instanceof ImmediateOperand) {
            return operand.getValue();
        }
        else if (operand instanceof ShifterOperand) {
            return this.barrelShifter(operand);
        }
        else {
            return undefined;
        }
    }

    barrelShifter(shifterOperand: ShifterOperand | undefined): number | undefined {
        if (typeof shifterOperand === 'undefined') {
            return undefined;
        }

        let result;
        let x = this.getOperandValue(shifterOperand.getOperandToShift())
        let shiftAmount = this.getOperandValue(shifterOperand.getShiftAmountOperand());
        if (typeof shiftAmount !== 'undefined' && shiftAmount > 31) {
            return 0;
        }
        let carry;

        if (typeof x !== 'undefined' && typeof shiftAmount !== 'undefined') {
            switch (shifterOperand.getShiftType()) {
                case "lsl":
                case "asl":
                    result = x << shiftAmount;
                    carry = (x << (shiftAmount - 1)) & 0x80000000;
                    break;
                case "lsr":
                    result = x >>> shiftAmount;
                    carry = (x >>> (shiftAmount - 1)) & 1;
                    break;
                case "asr":
                    result = x >> shiftAmount;
                    carry = (x >> (shiftAmount - 1)) & 1;
                    break;
                case "ror":
                    result = (x >>> shiftAmount) | (x << (32 - shiftAmount));
                    carry = (x >>> (shiftAmount - 1)) & 1;
                    break;
                // TODO RRX only by 1 bit?
                case "rrx":
                    result = (x >>> shiftAmount) | (x << (32 - shiftAmount + 1));
                    result |= (this.newStatusRegister.getC() << (32 - shiftAmount));
                    carry = (x >>> (shiftAmount - 1)) & 1;
                    break;
            }
        }

        if (this.currentLine instanceof Instruction && this.currentLine.getUpdateStatusRegister() && typeof carry !== 'undefined') {
            this.newStatusRegister.setC(carry === 0 ? 0 : 1);
        }

        return (typeof result !== 'undefined') ? this.setTo32Bit(result) : result;
    }

    setTo32Bit(x: number): number {
        return x >>> 0;
    }
}