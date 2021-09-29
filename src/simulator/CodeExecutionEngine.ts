import { Cpu, MessageType } from "./Cpu";
import { Instruction, ArithmeticInstruction, LogicInstruction, CopyInstruction, JumpInstruction, LoadStoreInstruction, MultiplicationInstruction, SoftwareInterrupt, LoadStoreMultipleInstruction, SwapInstruction } from "./Instructions";
import { Operand, RegisterOperand, ImmediateOperand, ShifterOperand, BranchOperand, LoadStoreOperand, LoadImmediateOperand } from './Operands';
import { MainMemory } from "./MainMemory";
import { StatusRegister } from "./StatusRegister";
import { AddressingMode, AddressingModeToIncrement } from "./InstructionEncoder";

export { CodeExecutionEngine };

// Different debugger speeds
enum DebuggerSpeed {
    Instant = 0,
    Slow = 300,
    Medium = 100,
    Fast = 10
}

/*
    Class for the code execution engine, that executes instructions on the cpu by
    reading the instructions from the memory attached to that cpu.

    Has the same field with "new" in front, so the user interface doesn't need to
    be updated every step if the debugger speed is set to Instant.

    cpu: Cpu
        Cpu the engine is attached to
    newRegisters: number[]
        Current registers the engine works with
    newStatusRegister: StatusRegister:
        Current status register the engine works with
    newMainMemory: MainMemory | undefined:
        Current main memory the engin work with, undefined on initialization
    currentLine: Instruction | number | undefined:
        Current line of the instruction to be executed
    debuggerSpeed: DebuggerSpeed
        Speed of the debugger when executed with continue
    stop: boolean:
        Stop value, when the engine is stopped (breakpoints, end of instructions)
    breakpoints: Set<number>:
        Set of currently set breakpoints
    stackTrace: number[]
        Array with the current stack trace
*/
class CodeExecutionEngine {
    cpu: Cpu;
    newRegisters: number[];
    newStatusRegister: StatusRegister;
    newMainMemory: MainMemory | undefined;
    currentLine: Instruction | number | undefined;
    debuggerSpeed: DebuggerSpeed;
    stop: boolean;
    stopSubroutine: boolean;
    breakpoints: Set<number>;
    stackTrace: number[];
    maxContinueInstructions: number;

    constructor(cpu: Cpu) {
        this.cpu = cpu;
        this.newRegisters = [];
        this.newStatusRegister = new StatusRegister();
        this.newMainMemory = undefined;
        this.currentLine = undefined;
        this.debuggerSpeed = DebuggerSpeed.Instant;
        this.stop = false;
        this.stopSubroutine = false;
        this.breakpoints = new Set();
        this.stackTrace = [0];

        this.maxContinueInstructions = 5000000;
    }

    /*
        Function that delays the engine, when the debugger speed is not set to Instant

        ms: number
            Milliseconds to delay

        Code/Idea from:
        https://stackoverflow.com/questions/14226803/wait-5-seconds-before-executing-next-line
    */
    delay = (ms: number) => new Promise(res => setTimeout(res, ms));

    /*
        Function that executes instructions until the stop value is reached, or the maximum number of instructions
        until automatic breakpoint is exceeded.
    */
    continue = async () => {
        // Get own register and memory, so user interface is not updated each step
        this.newRegisters = [...this.cpu.state.registers];
        this.newStatusRegister = this.cpu.state.statusRegister;
        this.newMainMemory = this.cpu.state.mainMemory;

        // variables to stop after end of subroutine
        let endOfSubroutine = false;
        let stackSizeEndSubroutine = this.stackTrace.length - 1;

        let currentNumInstruction = 0;
        // execute instructions until stop, instructions not successful or maximum number of instructions
        // until automatic breakpoint is exceeded
        do {
            // automatic breakpoint
            if (currentNumInstruction++ > this.maxContinueInstructions) {
                this.cpu.newTerminalMessage("Automatic breakpoint after " + this.maxContinueInstructions + " Instructions reached!", MessageType.Error)
                break;
            }
            // wait if speed not Instant
            if (this.debuggerSpeed !== DebuggerSpeed.Instant) {
                await this.delay(this.debuggerSpeed.valueOf())
                this.cpu.setState({ registers: this.newRegisters, statusRegister: this.newStatusRegister, mainMemory: this.newMainMemory });
            }
            // return from subroutine
            if (this.stopSubroutine && (this.stackTrace.length === stackSizeEndSubroutine)) {
                // stop this time
                endOfSubroutine = true;
                // reset stopSubroutine
                this.stopSubroutine = false;
            }
        } while (!endOfSubroutine && this.executeNextInstruction() && !this.stop);

        // update register at the end, if speed is Instant
        this.cpu.setState({ registers: this.newRegisters, statusRegister: this.newStatusRegister, mainMemory: this.newMainMemory });
    }

    /*
        Function that executes the next instruction based on the value in the PC.

        return: boolean
            True, if function executed successfully
    */
executeNextInstruction(): boolean {
    // get PC
    let memoryAddress = this.newRegisters[15];

    // check for aligned memory address
    if (memoryAddress % 4 === 0 && typeof this.newMainMemory !== 'undefined') {
        // execute instruction
        this.currentLine = this.newMainMemory.getMemoryLine(memoryAddress).getContent();
        let successful = this.executeInstruction();
        // stop after, if there is a breakpoint
        if (this.breakpoints.has(this.newRegisters[15])) {
            this.stop = true;
        }

        // update last element of current stack trace
        this.stackTrace[this.stackTrace.length - 1] = this.newRegisters[15]

        return successful;
    }
    // unaligned address
    else {
        this.cpu.newTerminalMessage("Invalid Memory Address!", MessageType.Error);
        return false;
    }
}

    /*
        Function that executes an instruction or calls the correct function to execute more
        complicated instructions.

        return: boolean
            True, if function executed successfully
    */
    executeInstruction(): boolean {
        if (this.currentLine instanceof Instruction) {
            // get currentline and increase PC
            let inst = this.currentLine;
            this.newRegisters[15] += 4;

            let condition = inst.getCondition();
            let flags = this.newStatusRegister.getFlags();

            // check conditional execution
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

            // Arithmetic instruction
            if (inst instanceof ArithmeticInstruction) {
                // get target register
                let x = inst.getOp1();
                if (x instanceof RegisterOperand && typeof x !== 'undefined') { targetRegister = x.getIndex() };

                op1 = this.getOperandValue(inst.getOp1());
                op2 = this.getOperandValue(inst.getOp2());
                op3 = this.getOperandValue(inst.getOp3());
                // call arithmetic function depending on number of operands
                if (typeof op2 !== 'undefined') {
                    if (typeof op3 !== 'undefined') {
                        result = this.arithmetic(inst, op2, op3, op4);
                    }
                    else if (typeof op1 !== 'undefined') {
                        result = this.arithmetic(inst, op1, op2, op4);
                    }
                }
            }
            // Multiplication instruction
            else if (inst instanceof MultiplicationInstruction) {
                // get target register
                let x = inst.getOp1();
                if (x instanceof RegisterOperand && typeof x !== 'undefined') { targetRegister = x.getIndex() };


                op1 = this.getOperandValue(inst.getOp1());
                op2 = this.getOperandValue(inst.getOp2());
                op3 = this.getOperandValue(inst.getOp3());
                op4 = this.getOperandValue(inst.getOp4());
                // call arithmetic function depending on number of operands
                if (typeof op2 !== 'undefined') {
                    if (typeof op3 !== 'undefined') {
                        result = this.arithmetic(inst, op2, op3, op4);
                    }
                    else if (typeof op1 !== 'undefined') {
                        result = this.arithmetic(inst, op1, op2, op4);
                    }
                }
            }
            // Logic instruction
            else if (inst instanceof LogicInstruction) {
                // get target register
                let x = inst.getOp1();
                if (x instanceof RegisterOperand && typeof x !== 'undefined') { targetRegister = x.getIndex() };

                op1 = this.getOperandValue(inst.getOp1());
                op2 = this.getOperandValue(inst.getOp2());
                op3 = this.getOperandValue(inst.getOp3());
                // call logic function depending on number of operands
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
            // Copy instruction
            else if (inst instanceof CopyInstruction) {
                // get target register
                let x = inst.getOp1();
                targetRegister = x.getIndex()
                op2 = inst.getOp2();

                // get value to load
                let op2Value = this.getOperandValue(op2);
                if (typeof op2Value !== 'undefined') {
                    result = this.copy(inst, op2Value);
                }

                // if PC is updated, jump to new address
                if (targetRegister === 15) {
                    if (result !== undefined) {
                        this.cpu.state.mainMemory.setGoto(result);
                        this.cpu.state.mainMemory.gotoMemoryAddress();
                    }
                    // pop stack trace if jump back to LR
                    if (op2 instanceof RegisterOperand && op2.getIndex() === 14) {
                        this.stackTrace.pop();
                    }
                }

            }
            // Copy instruction
            else if (inst instanceof JumpInstruction) {
                // get jump address
                let x = inst.getOp1();
                let address = this.cpu.state.mainMemory.getLabelToAddress().get(x.toString());

                // valid label
                if (typeof address !== 'undefined') {
                    // save to LR in case of bl
                    if (inst.getInstruction() === "bl") {
                        this.newRegisters[14] = this.newRegisters[15];
                        this.stackTrace.push(address);
                    }
                    this.newRegisters[15] = address;

                    // jump to new address
                    this.cpu.state.mainMemory.setGoto(address);
                    this.cpu.state.mainMemory.gotoMemoryAddress();
                }
                // invalid label
                else {
                    this.cpu.newTerminalMessage("Invalid branch label!", MessageType.Error)
                    return false;
                }

            }
            // Call correct function for load/store, swap, load/store multiple and software interrupt
            else if (inst instanceof LoadStoreInstruction) {
                if (!this.loadStore(inst)) { return false; }
            }
            else if (inst instanceof SwapInstruction) {
                if (!this.swap(inst)) { return false; }
            }
            else if (inst instanceof LoadStoreMultipleInstruction) {
                if (!this.loadStoreMultiple(inst)) { return false; }
            }
            else if (inst instanceof SoftwareInterrupt) {
                this.softwareInterrupt();
            }

            // update target register if instruction returned a result
            if (typeof result !== 'undefined' && typeof targetRegister !== 'undefined') {
                this.newRegisters[targetRegister] = this.setTo32Bit(result);
            }
            return true;
        }
        // no more new instructions without SWI exit
        else {
            this.cpu.newTerminalMessage("Instructions finished!", MessageType.Warning)
            return false;
        }
    }

    /*
        Function to evaluate arithmetic and multiplication instructions

        inst: Instruction
            Name of the instuction
        a: number
            First operand
        b: number
            Second operand
        x?: number
            Optional third operand in case of MLA
        
        return: number | undefined
            Result of the instruction
    */
    arithmetic(inst: Instruction, a: number, b: number, x?: number): number | undefined {
        let y = undefined;
        let isArithmetic = true;
        let isSubtraction = false;

        // calculate result of instruction
        switch (inst.getInstruction()) {
            case "add": y = (a + b); break;
            case "adc": y = (a + b + this.newStatusRegister.getC()); break;
            case "sub": b = ~b; y = (a + b + 1); isSubtraction = true; break;
            case "sbc": b = ~b; y = (a + b + 1 + this.newStatusRegister.getC() - 1); isSubtraction = true; break;
            case "rsb": a = ~a; y = (b + a + 1); isSubtraction = true; break;
            case "rsc": a = ~a; y = (b + a + 1 + this.newStatusRegister.getC() - 1); isSubtraction = true; break;
            case "mul": y = (a * b); isArithmetic = false; break;
            case "mla": y = ((typeof x !== 'undefined') ? (a * b) + x : undefined); isArithmetic = false;
        }

        // update status register
        if (inst.getUpdateStatusRegister() && typeof y !== 'undefined') {
            this.newStatusRegister.updateFlags(y, a, b, isSubtraction, isArithmetic);
        }

        return y;
    }

    /*
        Function to evaluate logical instructions

        inst: Instruction
            Name of the instuction
        a: number
            First operand
        b: number
            Second operand
        
        return: number | undefined
            Result of the instruction
    */
    logical(inst: Instruction, a: number, b: number,): number | undefined {
        let y = undefined;
        let isArithmetic = false;
        let isSubtraction = false;
        let resultNeeded = true;

        // calculate result of instruction
        switch (inst.getInstruction()) {
            case "and": y = (a & b); break;
            case "orr": y = (a | b); break;
            case "teq": y = (a ^ b); break;
            case "bic": b = ~b; y = (a & b); break;
            case "cmp": b = ~b; y = (a + b + 1); isArithmetic = true; isSubtraction = false; resultNeeded = false; break;
            case "cmn": y = (a + b); isArithmetic = true; resultNeeded = false; break;
            case "tst": y = (a & b); resultNeeded = false; break;
            case "eor": y = (a ^ b); resultNeeded = false;
        }

        // update status register
        if (inst.getUpdateStatusRegister() && typeof y !== 'undefined') {
            this.newStatusRegister.updateFlags(y, a, b, isSubtraction, isArithmetic);
        }

        if (resultNeeded) {
            return y;
        }
        return undefined;
    }

    /*
        Function to evaluate copy instructions

        inst: Instruction
            Name of the instuction
        b: number
            First operand
        
        return: number | undefined
            Result of the instruction
    */
    copy(inst: Instruction, b: number): number | undefined {
        let y = undefined;

        // calculate result of instruction
        switch (inst.getInstruction()) {
            case "mov": y = b; break;
            case "mvn": y = ~b; break;
        }

        // update status register
        if (inst.getUpdateStatusRegister() && typeof y !== 'undefined') {
            this.newStatusRegister.updateFlags(y, 0, b, false, false);
        }

        return y;
    }

    /*
        Function to evaluate load/store instructions

        inst: LoadStoreInstruction
            The instuction to be executed
        
        return: boolean
           True, if instruction executed successfully
    */
    loadStore(inst: LoadStoreInstruction): boolean {
        let reg = this.getOperandValue(inst.getOp1());
        let op2 = inst.getOp2();
        let format = inst.getFormat();

        // case of LoadStoreOperand
        if (op2 instanceof LoadStoreOperand) {
            // get register and offset
            let loadStoreReg = this.getOperandValue(op2.getRegister());
            let loadStoreOffset = this.getOperandValue(op2.getOffset());

            if (reg !== undefined && loadStoreReg !== undefined && this.newMainMemory !== undefined) {
                // possible negative offset
                if (op2.getNegativeRegOffset() && loadStoreOffset !== undefined) {
                    loadStoreOffset = -loadStoreOffset;
                }

                // preindexed
                if (op2.getPreIndexed()) {
                    // add offset before load/store
                    if (loadStoreOffset !== undefined) {
                        loadStoreReg += loadStoreOffset;
                        if (loadStoreReg < 0) { loadStoreReg += 0x100000000 }
                        else if (loadStoreReg >= 0xffffffff) { loadStoreReg = 0x100000000 - loadStoreReg }
                    }
                    // check aligned addresses for each format
                    if ((format === "" && loadStoreReg % 4 !== 0) || (["h", "sh"].includes(format) && loadStoreReg % 2 !== 0)) {
                        this.cpu.newTerminalMessage(this.cpu.toHex(loadStoreReg) + " not an aligned address!", MessageType.Error)
                        this.newRegisters[15] -= 4;
                        return false;
                    }

                    // load content from aligned memory address
                    let offset = loadStoreReg % 4;
                    let content = this.newMainMemory.getMemoryLine(loadStoreReg - offset).getContent();

                    if (typeof content === 'number') {
                        // store
                        if (inst.getInstruction() === "str") {
                            // change register/content based on format
                            switch (format) {
                                case "b":
                                    // move lowest byte of reg to correct position
                                    reg &= 0xff;
                                    reg <<= (offset * 8);
                                    // delete content byte and replace with reg byte
                                    content &= ~(0xff << (offset * 8));
                                    content |= reg;
                                    break;
                                case "h":
                                    // move lowest halfword of reg to correct position
                                    reg &= 0xffff;
                                    reg <<= (offset * 8);
                                    // delete content halfword and replace with reg halfword
                                    content &= ~(0xffff << (offset * 8));
                                    content |= reg;
                                    break;
                                default: content = reg;
                            }

                            // add the correct data
                            this.newMainMemory.addData(loadStoreReg - offset, content)
                        }
                        // load
                        else if (inst.getInstruction() === "ldr") {
                            // change register/content based on format
                            switch (format) {
                                case "b":
                                    content &= 0xff << (offset * 8);
                                    content >>>= (offset * 8);
                                    break;
                                case "sb":
                                    content &= 0xff << (offset * 8);
                                    content <<= (3 - offset) * 8;
                                    content >>= 24;
                                    content >>>= 0;
                                    break;
                                case "h":
                                    content &= 0xffff << (offset * 8);
                                    content >>>= (offset * 8);
                                    break;
                                case "sh":
                                    content &= 0xff << (offset * 8);
                                    content <<= (2 - offset) * 8;
                                    content >>= 16;
                                    content >>>= 0;
                                    break;
                            }

                            // load the correct data to a register
                            let index = inst.getOp1().getIndex();
                            this.newRegisters[index] = content;
                        }
                    }
                    // Self modifying code currently not supported
                    else {
                        this.cpu.newTerminalMessage("Loading/Storing data from/to an Instruction line is not supported!", MessageType.Warning)
                        this.newRegisters[15] -= 4;
                        return false;
                    }
                }
                // postindexed
                else {
                    // check aligned addresses for each format
                    if ((format === "" && loadStoreReg % 4 !== 0) || (["h", "sh"].includes(format) && loadStoreReg % 2 !== 0)) {
                        this.cpu.newTerminalMessage(this.cpu.toHex(loadStoreReg) + " not an aligned address!", MessageType.Error)
                        this.newRegisters[15] -= 4;
                        return false;
                    }

                    // load content from aligned memory address
                    let offset = loadStoreReg % 4;
                    let content = this.newMainMemory.getMemoryLine(loadStoreReg - offset).getContent();

                    if (typeof content === 'number') {
                        // store
                        if (inst.getInstruction() === "str") {
                            // change register/content based on format
                            switch (format) {
                                case "b":
                                    // move lowest byte of reg to correct position
                                    reg &= 0xff;
                                    reg <<= (offset * 8);
                                    // delete content byte and replace with reg byte
                                    content &= ~(0xff << (offset * 8));
                                    content |= reg;
                                    break;
                                case "h":
                                    // move lowest halfword of reg to correct position
                                    reg &= 0xffff;
                                    reg <<= (offset * 8);
                                    // delete content halfword and replace with reg halfword
                                    content &= ~(0xffff << (offset * 8));
                                    content |= reg;
                                    break;
                                default: content = reg;
                            }

                            // add the correct data
                            this.newMainMemory.addData(loadStoreReg - offset, content)
                        }
                        // load
                        else if (inst.getInstruction() === "ldr") {
                            // change register/content based on format
                            switch (format) {
                                case "b":
                                    content &= 0xff << (offset * 8);
                                    content >>>= (offset * 8);
                                    break;
                                case "sb":
                                    content &= 0xff << (offset * 8);
                                    content <<= (3 - offset) * 8;
                                    content >>= 24;
                                    content >>>= 0;
                                    break;
                                case "h":
                                    content &= 0xffff << (offset * 8);
                                    content >>>= (offset * 8);
                                    break;
                                case "sh":
                                    content &= 0xff << (offset * 8);
                                    content <<= (2 - offset) * 8;
                                    content >>= 16;
                                    content >>>= 0;
                                    break;
                            }

                            // load the correct data to a register
                            let index = inst.getOp1().getIndex();
                            this.newRegisters[index] = content;
                        }
                    }
                    // Self modifying code currently not supported
                    else {
                        this.cpu.newTerminalMessage("Loading/Storing data from/to an Instruction line is not supported!", MessageType.Warning)
                        this.newRegisters[15] -= 4;
                        return false;
                    }

                    // add loadStoreOffset postindexed
                    if (loadStoreOffset !== undefined) {
                        loadStoreReg += loadStoreOffset;
                    }
                }

                // increment basis register
                if (op2.getIncrement()) {
                    this.newRegisters[op2.getRegister().getIndex()] = loadStoreReg;
                }

            }
        }
        // case of LoadImmediateOperand
        else if (op2 instanceof LoadImmediateOperand && inst.getInstruction() === "ldr" && this.newMainMemory !== undefined) {
            let op2Immediate = op2.getImmediate();
            let content;

            // load label address
            if (op2Immediate instanceof BranchOperand) {
                let offset;
                let label = op2Immediate.getLabel();

                // possible label offset
                let splitLabelPlus = label.split("+");
                let splitLabelMinus = label.split("-");
                if (splitLabelPlus.length > 1) {
                    offset = +parseInt(splitLabelPlus[1]);
                    label = splitLabelPlus[0];
                }
                else if (splitLabelMinus.length > 1) {
                    offset = -parseInt(splitLabelMinus[1]);
                    label = splitLabelMinus[0];
                }

                // get address of label
                let contentAddress = this.newMainMemory?.getLabelToAddress().get(label);

                // load label address + offset in register
                if (contentAddress !== undefined) {
                    if (offset !== undefined) {
                        contentAddress += offset;
                    }
                    this.newRegisters[inst.getOp1().getIndex()] = contentAddress;
                }
                // else load variable to register
                else {
                    let variable = this.newMainMemory?.getVariables().get(label);
                    if (variable !== undefined) {
                        this.newRegisters[inst.getOp1().getIndex()] = variable;
                    }
                    else {
                        this.cpu.newTerminalMessage("Label or Variable \"" + label + "\" not found!", MessageType.Error)
                        this.newRegisters[15] -= 4;
                        return false;
                    }
                }

            }
            // otherwise simply load number
            else {
                content = op2Immediate;
                this.newRegisters[inst.getOp1().getIndex()] = content;
            }
        }
        else {
            return false;
        }

        return true;
    }

    /*
        Function to evaluate swap instructions

        inst: SwapInstruction
            The instuction to be executed
        
        return: boolean
           True, if instruction executed successfully
    */
    swap(inst: SwapInstruction): boolean {
        // get value of registers
        let op1Content = Number(this.getOperandValue(inst.getOp1()));
        let op2Content = Number(this.getOperandValue(inst.getOp2()));
        let loadStoreAddress = this.getOperandValue(inst.getOp3());
        let format = inst.getFormat();

        if (!isNaN(op2Content) && loadStoreAddress !== undefined && this.newMainMemory !== undefined) {
            // check aligned addresses for each format
            if ((format === "" && loadStoreAddress % 4 !== 0)) {
                this.cpu.newTerminalMessage(this.cpu.toHex(loadStoreAddress) + " not an aligned address!", MessageType.Error)
                this.newRegisters[15] -= 4;
                return false;
            }

            // load content from aligned memory line
            let offset = loadStoreAddress % 4;
            let content = this.newMainMemory.getMemoryLine(loadStoreAddress - offset).getContent();

            if (typeof content === 'number') {
                // change register/content based on format
                if (format === "b") {
                    // zero-extend it for content of op1
                    op1Content = (content & (0xff << (offset * 8))) >>> (offset * 8);
                    // replace lowest byte of op2 in content;
                    op2Content &= 0xff;
                    op2Content <<= (offset * 8);
                    op2Content |= (content &= ~(0xff << (offset * 8)));
                    op2Content >>>= 0;
                }
                else {
                    op1Content = content;
                }

                // load and store swapped values
                this.newRegisters[inst.getOp1().getIndex()] = op1Content;
                this.newMainMemory.addData(loadStoreAddress - offset, op2Content);
            }
            // Self modifying code currently not supported
            else {
                this.cpu.newTerminalMessage("Loading/Storing data from/to an Instruction line is not supported!", MessageType.Warning)
                this.newRegisters[15] -= 4;
                return false;
            }

        }
        else {
            return false;
        }

        return true;
    }

    /*
        Function to evaluate load/store multiple instructions

        inst: LoadStoreMultipleInstruction
            The instuction to be executed
        
        return: boolean
           True, if instruction executed successfully
    */
    loadStoreMultiple(inst: LoadStoreMultipleInstruction): boolean {
        let addressingMode = inst.getAddressingMode()

        // fd, fa, ed, ea
        let alternateAddressingMode = AddressingMode.get(inst.getInstruction() + inst.getAddressingMode());
        if (alternateAddressingMode !== undefined) {
            addressingMode = alternateAddressingMode;
        }

        // default without addressing mode
        let before = false;
        let increment = true;

        // ia, ib, da, db to increment/decrement and before/after
        let addrModeToIncrement = AddressingModeToIncrement.get(addressingMode);
        if (addrModeToIncrement !== undefined) {
            increment = addrModeToIncrement[0];
            before = addrModeToIncrement[1];
        }

        // get address and registers
        let address = this.getOperandValue(inst.getOp1());
        let registers = [...inst.getOp2().getRegisters()];

        // order of registers based on increment or decrement
        if (!increment) { registers = registers.reverse() }

        if (address !== undefined) {
            // store
            if (inst.getInstruction() === "stm") {
                // loop over register
                for (let x = 0; x < registers.length; x++) {
                    if (address !== undefined) {

                        // handle address over-/underflow before
                        if (before) {
                            increment ? address += 4 : address -= 4;
                            if (address < 0) { address += 0x100000000 }
                            else if (address >= 0xffffffff) { address = 0x100000000 - address }
                        }

                        // get value of register
                        let value = this.getOperandValue(registers[x]);
                        let successful = false;
                        // and store it to memory
                        if (value !== undefined) {
                            successful = this.cpu.state.mainMemory.addData(address, value)
                        }
                        // if unsuccessful decrease pc again
                        if (!successful) {
                            this.newRegisters[15] -= 4;
                            return false;
                        }

                        // handle address over-/underflow after
                        if (!before) {
                            increment ? address += 4 : address -= 4;
                            if (address < 0) { address += 0x100000000 }
                            else if (address >= 0xffffffff) { address = 0x100000000 - address }
                        }
                    }

                }
            }
            // load
            else if (inst.getInstruction() === "ldm") {
                // loop over register
                for (let x = 0; x < registers.length; x++) {
                    if (address !== undefined) {

                        // handle address over-/underflow before
                        if (before) {
                            increment ? address += 4 : address -= 4;
                            if (address < 0) { address += 0x100000000 }
                            else if (address >= 0xffffffff) { address = 0x100000000 - address }
                        }

                        // get value from memory
                        let value = this.cpu.state.mainMemory.getMemoryLine(address).getContent();
                        // and store it to registers
                        if (typeof value === 'number') {
                            let index = registers[x].getIndex()
                            this.newRegisters[index] = value;
                        }
                        // Self modifying code currently not supported
                        else {
                            this.cpu.newTerminalMessage("Loading data from an Instruction line not supported!", MessageType.Warning)
                            this.newRegisters[15] -= 4;
                            return false;
                        }

                        // handle address over-/underflow after
                        if (!before) {
                            increment ? address += 4 : address -= 4;
                            if (address < 0) { address += 0x100000000 }
                            else if (address >= 0xffffffff) { address = 0x100000000 - address }
                        }
                    }

                }
            }
            else {
                return false;
            }


            if (inst.getIncrement()) {
                this.newRegisters[inst.getOp1().getIndex()] = address;
            }
        }

        return true;
    }

    /*
        Function to evaluate software interrupts
    */
    softwareInterrupt() {
        // r0=0, r7=1 --> Exit
        if (this.newRegisters[0] === 0 && this.newRegisters[7] === 1) {
            this.cpu.newTerminalMessage("Program exited successfully!")
            this.newRegisters[15] -= 4;
            this.stop = true;
        }
        // r0=1, r7=4 --> Print to stdout
        else if (this.newRegisters[0] === 1 && this.newRegisters[7] === 4) {
            // address in r1
            let address = this.newRegisters[1];
            // length in r2
            let length = this.newRegisters[2];

            // counter when to switch to next memory line
            let nextLine = address % 4;
            // load whole memoryline, then choose character in loop
            address -= nextLine;

            let output = "";

            // loop until length reached
            for (let x = 0; x < length; x++) {
                // get content from memory line
                let memoryLine = this.newMainMemory?.getMemoryLine(address).getContent();

                if (typeof memoryLine === 'number') {
                    // get ascii from character code
                    output += String.fromCharCode((memoryLine >>> (nextLine * 8)) & 0xff);

                    // increase next line counter
                    nextLine++;

                    // if reached end of memory line, increase address and reset counter
                    if (nextLine === 4) {
                        nextLine = 0;
                        address += 4;
                    }
                }

            }

            // print the output to the terminal
            this.cpu.newTerminalOutput(output);
        }
        else {
            this.cpu.newTerminalMessage("Unkown Software Interrupt!", MessageType.Warning)
        }
    }

    /*
        Function to reset the stack trace
    */
    resetStackTrace() {
        this.stackTrace = [0];
    }

    /*
        Function to get the value of any operand

        operand: Operand | undefined
            Operand to get the value from
        
        return: number | undefined
            Value of the operand
    */
    getOperandValue(operand: Operand | undefined): number | undefined {
        // register: get value in register
        if (operand instanceof RegisterOperand) {
            return this.newRegisters[operand.getIndex()];
        }
        // immediate: get value of immediate
        else if (operand instanceof ImmediateOperand) {
            return operand.getValue();
        }
        // shifter operand: call barrel shifter
        else if (operand instanceof ShifterOperand) {
            return this.barrelShifter(operand);
        }
        else {
            return undefined;
        }
    }

    /*
        Function that implement the barrel shifter

        shifterOperand: ShifterOperand | undefined
            Operand to be shifter

        return: number | undefined
            Shifter operand value
    */
    barrelShifter(shifterOperand: ShifterOperand | undefined): number | undefined {
        if (typeof shifterOperand === 'undefined') {
            return undefined;
        }

        let result;

        // get current value of operand
        let x = this.getOperandValue(shifterOperand.getOperandToShift())
        // get value of shift amount operand
        let shiftAmount = this.getOperandValue(shifterOperand.getShiftAmountOperand());
        // no shift if incorrect value above 31
        if (typeof shiftAmount !== 'undefined' && shiftAmount > 31) {
            this.cpu.newTerminalMessage("Invalid shift amount > 31, value returned unshifted!", MessageType.Warning)
            return 0;
        }
        let carry;

        // shift the value base in the shift type with various bit operation tricks
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
                case "rrx":
                    result = (x >>> shiftAmount) | (x << (32 - shiftAmount + 1));
                    result |= (this.newStatusRegister.getC() << (32 - shiftAmount));
                    carry = (x >>> (shiftAmount - 1)) & 1;
                    break;
            }
        }

        // if the instruction in the current line updates the status register, set the carry bit to last bit
        // shifted out
        if (this.currentLine instanceof Instruction && this.currentLine.getUpdateStatusRegister() && typeof carry !== 'undefined') {
            this.newStatusRegister.setC(carry === 0 ? 0 : 1);
        }

        return (typeof result !== 'undefined') ? this.setTo32Bit(result) : result;
    }

    /*
        Function to set value to unsigned 32 bit number

        x: number
            Number to set to 32 bit

        return: number
            Unsigned 32 bit number
    */
    setTo32Bit(x: number): number {
        return x >>> 0;
    }
}