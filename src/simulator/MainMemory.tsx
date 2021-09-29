import React from "react";
import Button from '@material-ui/core/Button';
import InputBase from '@material-ui/core/InputBase';
import { InputBaseComponentProps, Popover } from "@material-ui/core";
import BreakpointDot from '@material-ui/icons/Brightness1Rounded';
import { positionValues, Scrollbars } from 'react-custom-scrollbars-2';
import { Cpu, MessageType } from "./Cpu";
import { InstructionEncoder } from "./InstructionEncoder";
import { Instruction, ArithmeticInstruction, LogicInstruction, CopyInstruction, JumpInstruction, LoadStoreInstruction, MultiplicationInstruction, SoftwareInterrupt, LoadStoreMultipleInstruction, SwapInstruction } from "./Instructions";
import { RegisterOperand, ImmediateOperand, ShifterOperand, BranchOperand, LoadStoreOperand, LoadImmediateOperand, LoadStoreMultipleOperand } from './Operands';

export { MainMemory };

/*
    Class that implements the main memory that contains memory lines with
    instructions or data.

    cpu: Cpu
        Cpu the main memory is attached to.
    instructionEncoder: InstructionEncoder
        InstructionEncoder to encode the instructions in the main memory
    memoryLines:  Map<number, MemoryLine>
        Map of addresses with corresponding memory line
    labelToAddress: Map<string, number>
        Map to convert labels to corresponding address
    addressToLabel: Map<number, string>;
        Map to check if address has a label
    variables: Map<string, number>
        Map of variables (e.g.: len = . - msg)

    // References for automatic updating when scrolling out of range
    scrollRef: React.RefObject<Scrollbars>
        Reference to scrollable part of main memory
    scrollRefTop: React.RefObject<any>
        Reference to current top memory line
    scrollRefMid: React.RefObject<any>
        Reference to current middle memory line
    scrollRefBot: React.RefObject<any>
        Reference to current bottom memory line

    memoryPosition: number
        Current memory position
    memoryPositionFocus: string
        Memory position to scroll into view
    preloadedMemoryLines: number
        Number of preloaded memory lines
    goto: number
        Address field the user wants to jump to and focus
*/
class MainMemory {
    private cpu: Cpu;
    private instructionEncoder: InstructionEncoder;
    private memoryLines: Map<number, MemoryLine>;
    private labelToAddress: Map<string, number>;
    private addressToLabel: Map<number, string>;
    private variables: Map<string, number>;
    private scrollRef: React.RefObject<Scrollbars>;
    private scrollRefTop: React.RefObject<any>;
    private scrollRefMid: React.RefObject<any>;
    private scrollRefBot: React.RefObject<any>;
    private memoryPosition: number;
    private memoryPositionFocus: string;
    private preloadedMemoryLines: number;
    private goto: number;


    constructor(cpu: Cpu) {
        this.cpu = cpu;
        this.instructionEncoder = new InstructionEncoder(this);
        this.memoryLines = new Map();
        this.labelToAddress = new Map();
        this.addressToLabel = new Map();
        this.variables = new Map();
        this.scrollRef = React.createRef();
        this.scrollRefTop = React.createRef();
        this.scrollRefMid = React.createRef();
        this.scrollRefBot = React.createRef();
        this.memoryPosition = 0x00000000;
        this.preloadedMemoryLines = 100;
        this.memoryPositionFocus = this.cpu.toHex(this.memoryPosition);
        this.goto = 0x00000000;

        this.setScroll = this.setScroll.bind(this);
    }

    /*
        Function to reset the memory and clear all data and instructions.
    */
    resetMemory() {
        // create new Maps or reset fields to standard value
        this.memoryLines = new Map();
        this.labelToAddress = new Map();
        this.addressToLabel = new Map();
        this.memoryPosition = 0x00000000;
        this.memoryPositionFocus = this.cpu.toHex(this.memoryPosition);
        this.goto = 0x00000000;
        this.gotoMemoryAddress();

        this.cpu.state.codeExecutionEngine.resetStackTrace();

        // also reset the PC back to 0
        let newRegisters = [...this.cpu.state.registers];
        newRegisters[15] = 0;
        this.cpu.setState({ registers: newRegisters });
    }


    /*
        Function to retrieve a memoryline from the main memory. Returns
        memory line with 0, if not initialized.

        address: number
            Address of the memory line to get

        return: MemoryLine
            MemoryLine at that address
    */  
    getMemoryLine(address: number): MemoryLine {
        // check if memory line initialized
        let memoryLine = this.memoryLines.get(address);

        // else return new memory line with 0 and give warning
        if (memoryLine === undefined) {
            memoryLine = new MemoryLine(0);
        }

        return memoryLine;
    }

    /*
        Function to add an instruction based on the given values.

        instruction: string
            Name of the instruction
        condition: string 
            Condition under which the instruction should be executed
        updateStatusRegister: boolean
            S bit that determines if the status register should be updated
        op1String: string
            First operand
        op2String: string
            Second operand
        op3String: string
            Third operand
        op4String: string
            Fourth operand
        address?: number
           Optional address the instruction should be added to. Otherwise added
           to the next free memory line.
           
        return: boolean
            True, if adding the instruction was successful
    */  
    addInstruction(instruction: string, condition: string, updateStatusRegister: boolean,
        op1String: string | undefined, op2String: string | undefined, op3String: string | undefined,
        op4String: string | undefined, address?: number): boolean {

        // convert string to lowercase for easier handling later
        instruction = instruction.toLowerCase();
        condition = condition.toLowerCase();
        op1String = op1String?.toLowerCase();
        op2String = op2String?.toLowerCase();
        op3String = op3String?.toLowerCase();
        op4String = op4String?.toLowerCase();

        // define a new instruction and possible invalid operands
        let newInstruction;
        let invalidOperands: (string | undefined)[] = [];

        // add arithmetic instruction
        if (["add", "adc", "sub", "sbc", "rsb", "rsc"].includes(instruction)) {
            // only consider first three operands
            let op1 = this.addRegisterOperand(op1String);
            let op2 = this.addRegImmShiftOperand(op2String);
            let op3 = this.addRegImmShiftOperand(op3String);

            // valid operands
            if (op1 !== undefined && op2 !== undefined) {
                // all 3 operands defined
                if (op3 !== undefined) {
                    newInstruction = new ArithmeticInstruction(instruction, condition, op1, op2, op3, updateStatusRegister);
                }
                // 2 operands defined, so use op1 for first 2 operands
                else if (op3String === "") {
                    newInstruction = new ArithmeticInstruction(instruction, condition, op1, op1, op2, updateStatusRegister);
                }
                // op3String is undefined and not empty
                else {
                    invalidOperands.push(op3String)
                }
            }
            // operands undefined
            else {
                if (op1 === undefined) { invalidOperands.push(op1String) }
                if (op2 === undefined) { invalidOperands.push(op2String) }
                if (op3 === undefined) { invalidOperands.push(op3String) }
            }
        }
        // add multiplication instruction
        else if (["mul", "mla"].includes(instruction)) {
            // consider all 4 operands
            let op1 = this.addRegisterOperand(op1String);
            let op2 = this.addRegisterOperand(op2String);
            let op3 = this.addRegisterOperand(op3String);
            let op4 = this.addRegisterOperand(op4String);

            // valid operands
            if (op1 !== undefined && op2 !== undefined && op3 !== undefined) {
                // mul
                if (instruction === "mul") {
                    newInstruction = new MultiplicationInstruction(instruction, condition, op1, op2, op3, undefined, updateStatusRegister);
                }
                // mla
                else if (op4 !== undefined) {
                    newInstruction = new MultiplicationInstruction(instruction, condition, op1, op2, op3, op4, updateStatusRegister);
                }
                // mla and op4String undefined
                else {
                    invalidOperands.push(op4String)
                }
            }
            // operands undefined
            else {
                if (op1 === undefined) { invalidOperands.push(op1String) }
                if (op2 === undefined) { invalidOperands.push(op2String) }
                if (op3 === undefined) { invalidOperands.push(op3String) }
                if (op4 === undefined) { invalidOperands.push(op4String) }
            }
        }
        // add logic instruction with 3 operands
        else if (["and", "orr", "eor", "bic"].includes(instruction)) {
            // only consider first three operands
            let op1 = this.addRegisterOperand(op1String);
            let op2 = this.addRegImmShiftOperand(op2String);
            let op3 = this.addRegImmShiftOperand(op3String);

            // valid operands
            if (op1 !== undefined && op2 !== undefined) {
                // all 3 operands defined
                if (op3 !== undefined) {
                    newInstruction = new LogicInstruction(instruction, condition, op1, op2, op3, updateStatusRegister);
                }
                // 2 operands defined, so use op1 for first 2 operands
                else if (op3String === "") {
                    newInstruction = new LogicInstruction(instruction, condition, op1, op1, op2, updateStatusRegister);
                }
                // op3String is undefined and not empty
                else {
                    invalidOperands.push(op3String)
                }
            }
            // operands undefined
            else {
                if (op1 === undefined) { invalidOperands.push(op1String) }
                if (op2 === undefined) { invalidOperands.push(op2String) }
                if (op3 === undefined) { invalidOperands.push(op3String) }
            }
        }
        // add logic instruction with 2 operands
        else if (["cmp", "cmn", "tst", "teq"].includes(instruction)) {
            // only consider two operands
            let op1 = this.addRegisterOperand(op1String);
            let op2 = this.addRegImmShiftOperand(op2String);

            // valid operands
            if (op1 !== undefined && op2 !== undefined) {
                newInstruction = new LogicInstruction(instruction, condition, op1, op2, undefined, true);
            }
            // operands undefined
            else {
                if (op1 === undefined) { invalidOperands.push(op1String) }
                if (op2 === undefined) { invalidOperands.push(op2String) }
            }
        }
        // add copy instruction
        else if (["mov", "mvn"].includes(instruction)) {
            // only consider two operands
            let op1 = this.addRegisterOperand(op1String);
            let op2 = this.addRegImmShiftOperand(op2String);

            // valid operands
            if (op1 !== undefined && op2 !== undefined) {
                newInstruction = new CopyInstruction(instruction, condition, op1, op2, updateStatusRegister);
            }
            // operands undefined
            else {
                if (op1 === undefined) { invalidOperands.push(op1String) }
                if (op2 === undefined) { invalidOperands.push(op2String) }
            }
        }
        // add jump instruction
        else if (["b", "bl"].includes(instruction)) {
            // valid operand
            if (op1String !== undefined) {
                let op1 = new BranchOperand(op1String);
                newInstruction = new JumpInstruction(instruction, condition, op1, updateStatusRegister);
            }
            // operands undefined
            else {
                invalidOperands.push(op1String);
            }
        }
        // add load/store instruction
        else if (["ldr", "str"].includes(instruction.substring(0, 3))) {
            // split up instruction into name and format
            let inst = instruction.substring(0, 3)
            let format = instruction.substring(3);

            // check for valid format
            if (["b", "h", "sb", "sh", ""].includes(format)) {
                // only ldr has all formats
                if ((inst === "str" && ["sb", "sh"].includes(format)) || (inst === "swp" && ["h", "sb", "sh"].includes(format))) {
                }
                // valid format
                else {
                    // only consider two operands
                    let op1 = this.addRegisterOperand(op1String);
                    let op2 = this.addLoadStoreOperand(op2String);

                    // valid operands
                    if (op1 !== undefined && op2 !== undefined) {
                        newInstruction = new LoadStoreInstruction(inst, format, condition, op1, op2, updateStatusRegister);
                    }
                    // operands undefined
                    else {
                        if (op1 === undefined) { invalidOperands.push(op1String) }
                        if (op2 === undefined) { invalidOperands.push(op2String) }
                    }
                }
            }
        }
        // add swap instruction
        else if (instruction.substring(0, 3) === "swp") {
            // split up instruction into name and format
            let inst = instruction.substring(0, 3)
            let format = instruction.substring(3);

            // check for valid format
            if (["b", ""].includes(format)) {
                // only consider first three operands
                let op1 = this.addRegisterOperand(op1String);
                let op2 = this.addRegisterOperand(op2String);
                let op3 = this.addRegisterOperand(op3String);

                // valid operands
                if (op1 !== undefined && op2 !== undefined && op3 !== undefined) {
                    newInstruction = new SwapInstruction(inst, format, condition, op1, op2, op3, updateStatusRegister);
                }
                // operands undefined
                else {
                    if (op1 === undefined) { invalidOperands.push(op1String) }
                    if (op2 === undefined) { invalidOperands.push(op2String) }
                    if (op3 === undefined) { invalidOperands.push(op3String) }
                }

            }
        }
        // add load/store multiple instruction
        else if (["ldm", "stm"].includes(instruction.substring(0, 3))) {
            // check if basis register should be incremented
            let increment = false;
            if (op1String !== undefined && op1String[op1String.length - 1] === "!") {
                increment = true;
                op1String = op1String.slice(0, -1);
            }

            // only consider two operands
            let op1 = this.addRegisterOperand(op1String);
            let op2 = this.addLoadStoreMultipleOperand(op2String);

            // check for valid addressing mode
            let addressingMode = instruction.substring(3);
            let validAddressingMode = ["fa", "ea", "fd", "ed", "ia", "ib", "da", "db", ""].includes(addressingMode)

            // valid operands
            if (op1 !== undefined && op2 !== undefined && validAddressingMode) {
                newInstruction = new LoadStoreMultipleInstruction(instruction.substring(0, 3), condition, op1, op2, addressingMode, increment, updateStatusRegister);
            }
            // operands undefined
            else {
                if (op1 === undefined || !validAddressingMode) { invalidOperands.push(op1String) }
                if (op2 === undefined) { invalidOperands.push(op2String) }
            }
        }
        // add software interrupt
        else if (["swi"].includes(instruction)) {
            newInstruction = new SoftwareInterrupt(instruction, condition, false);
        }

        // if there are invalid operands, print error message and return false
        if (invalidOperands.length !== 0) {
            invalidOperands.forEach(op => {
                this.cpu.newTerminalMessage(op + " is an invalid operand!", MessageType.Error);
            })
            return false;
        }
        // else add the instruction if it is defined
        else if (typeof newInstruction !== 'undefined') {
            // add instruction at given address
            if (address !== undefined) {
                // check for aligned address
                if (address % 4 === 0) {
                    this.memoryLines.set(address, new MemoryLine(newInstruction));
                }
                // not aligned address
                else {
                    this.cpu.newTerminalMessage("Address not aligned!", MessageType.Error)
                    return false;
                }
            }
            // or else add instruction at next free memory line
            else {
                this.memoryLines.set((this.memoryLines.size * 4), new MemoryLine(newInstruction));
            }
        }
        // unkown instruction
        else {
            this.cpu.newTerminalMessage(instruction + " is an invalid instruction!", MessageType.Error);
            return false;
        }

        // return true if it has passed all check and the instruction was added
        return true;
    }

    /*
        Function to add a label at a given address.

        address: number
            Address of the label
        label: string
            Label to add

        return: boolean
             True, if adding the label was successful
    */
    addLabel(address: number, label: string): boolean {
        // check for aligned address
        if (address % 4 !== 0) {
            this.cpu.newTerminalMessage("Address not aligned!", MessageType.Error);
            return false;
        }

        // label with same name already exists
        if (typeof this.labelToAddress.get(label) !== 'undefined') {
            this.cpu.newTerminalMessage(label + " already exists!", MessageType.Error);
            return false;
        }
        // address already has a label
        else if (typeof this.addressToLabel.get(address) !== 'undefined') {
            this.cpu.newTerminalMessage(this.cpu.toHex(address) + " already has a label!", MessageType.Error);
            return false;
        }

        // add them to both maps concerning labels
        this.labelToAddress.set(label, address);
        this.addressToLabel.set(address, label);

        return true;
    }

    /*
        Function to add data to the main memory

        address: number
            Address to which to add the data
        data: number
            Number with the data to be added

        return: boolean
            True, if adding the data was successful
    */
    addData(address: number, data: number): boolean {
        // deny adding data at memory line with an instruction
        // self modifying code currently not supported
        if (this.getMemoryLine(address).getContent() instanceof Instruction) {
            this.cpu.newTerminalMessage(this.cpu.toHex(address) + " is a Code Section!", MessageType.Error);
            return false;
        }

        // add data
        this.memoryLines.set(address, new MemoryLine(data))
        return true;
    }

    /*
        Function to add a register, immediate or shifter operand

        op: string | undefined
            String with the operand to add

        return: RegisterOperand | ImmediateOperand | ShifterOperand | undefined
            An operand if it was successful, undefined otherwise
    */
    addRegImmShiftOperand(op: string | undefined): RegisterOperand | ImmediateOperand | ShifterOperand | undefined {
        // handle undefined values
        if (op === undefined) { return undefined; }
        // replace all empty characters
        op = op.replace(/\s+/g, '');

        // call correct function for either shifter or a register/immedidate operand
        if (op.split(',').length > 1) { return this.addShifterOperand(op) }
        else { return this.addRegImmOperand(op) }
    }

    /*
        Function to add a register or immediate operand

        op:  string | undefined
            String with the operand to add

        return:  RegisterOperand | ImmediateOperand | undefined
            An operand if it was successful, undefined otherwise
    */
    addRegImmOperand(op: string | undefined): RegisterOperand | ImmediateOperand | undefined {
        // handle undefined values
        if (op === undefined) { return undefined; }
        // replace all empty characters
        op = op.replace(/\s+/g, '');

        // call correct function for either register or immediate operand
        switch (op.substring(0, 1)) {
            case "#": return this.addImmediateOperand(op);
            default: return this.addRegisterOperand(op);;
        }
    }

    /*
        Function to add a register operand

        op: string | undefined
            String with the operand to add

        return:  RegisterOperand | undefined
            An operand if it was successful, undefined otherwise
    */
    addRegisterOperand(op: string | undefined): RegisterOperand | undefined {
        // handle undefined values
        if (op === undefined) { return undefined; }
        // replace all empty characters
        op = op.replace(/\s+/g, '');

        // handle special names for registers
        switch (op) {
            case "sp": return new RegisterOperand(13);
            case "lr": return new RegisterOperand(14);
            case "pc": return new RegisterOperand(15);
        }

        // else check index of register
        if (op.substring(0, 1) !== "r") { return undefined; }

        let index = Number(op.substring(1));
        if (index >= 0 && index < 16 && !isNaN(index)) {
            return new RegisterOperand(index);
        }

        return undefined;
    }

    /*
        Function to add an immediate operand

        op: string | undefined
            String with the operand to add

        return: ImmediateOperand | undefined
            An operand if it was successful, undefined otherwise
    */
    addImmediateOperand(op: string | undefined): ImmediateOperand | undefined {
        // handle undefined values
        if (op === undefined) { return undefined; }
        // replace all empty characters
        op = op.replace(/\s+/g, '');

        // check if correct format for immediate operand
        if (op.substring(0, 1) !== "#") { return undefined; }

        let operandValueString = op.substring(1);

        // check for a sign
        let isPositive = true;
        switch (operandValueString.substring(0, 1)) {
            case "+":
                operandValueString = operandValueString.substring(1);
                break;
            case "-":
                isPositive = false;
                operandValueString = operandValueString.substring(1);
                break;
        }

        // get the base
        let base = 10;
        let baseString = operandValueString.substring(0, 2);
        let operandValue;

        switch (baseString) {
            case "0x": base = 16; break;
            case "0o": base = 8; break;
            case "0b": base = 2; break;
        }

        // read the value
        if (isPositive) {
            operandValue = Number(operandValueString);
        }
        else {
            operandValue = Number(-operandValueString);
        }

        // couldn't read a number
        if (isNaN(operandValue)) {
            return undefined;
        }

        // check with mask if value is possible with barrel shifter
        let mask = 0xffffff00
        for (let i = 0; i < 16; i++) {
            // possible with mov
            if ((mask & operandValue) === 0) {
                let backShift = 32 - 2 * i;
                let immed8 = ((operandValue >>> backShift) | (operandValue << (32 - backShift))) >>> 0
                return new ImmediateOperand(immed8, i, base);
            }
            // possible with mvn
            if ((mask & ~operandValue) === 0) {
                let backShift = 32 - 2 * i;
                let immed8 = ((~operandValue >>> backShift) | (~operandValue << (32 - backShift))) >>> 0
                return new ImmediateOperand(~immed8, i, base);
            }
            mask = ((mask >>> 2) | (mask << (32 - 2))) >>> 0;
        }


        return undefined;
    }

    /*
        Function to add a shifter operand

        op: string | undefined
            String with the operand to add

        return: ShifterOperand | undefined
            An operand if it was successful, undefined otherwise
    */
    addShifterOperand(op: string | undefined): ShifterOperand | undefined {
        // handle undefined values
        if (op === undefined) { return undefined; }
        // replace all empty characters
        op = op.replace(/\s+/g, '');

        // split up the operand in two parts
        let opParts = op.split(',')

        // operand 1 is either a register or immediate operand
        let operand1 = this.addRegImmOperand(opParts[0]);
        if (operand1 === undefined) { return undefined; }

        // first three characters of second part defined the shift type
        let shiftType = opParts[1].substring(0, 3);
        if (!["lsl", "asl", "lsr", "asr", "ror", "rrx"].includes(shiftType)) { return undefined; }

        // operand with amount of shifting
        let shifterOperand = opParts[1].substring(3);
        // can only be a register of immediate operand, no nested shifter operands
        let operand2 = this.addRegImmOperand(shifterOperand)

        // fails if operands is undefined
        if (operand2 === undefined) { return undefined; }
        // or the value of the immediate is bigger than 31
        if (operand2 instanceof ImmediateOperand && operand2.getValue() > 31) { return undefined; }

        return new ShifterOperand(operand1, shiftType, operand2);
    }

    /*
        Function to add a load/store operand

        op: string | undefined
            String with the operand to add

        return: LoadStoreOperand | LoadImmediateOperand | undefined
            An operand if it was successful, undefined otherwise
    */
    addLoadStoreOperand(op: string | undefined): LoadStoreOperand | LoadImmediateOperand | undefined {
        // handle undefined values
        if (op === undefined) { return undefined; }
        // replace all empty characters
        op = op.replace(/\s+/g, '');

        // loading arbitrary immediate value
        if (op[0] === "=") {
            let opValueString = op.substring(1);

            // check for a sign
            let isPositive = true;
            switch (opValueString.substring(0, 1)) {
                case "+":
                    opValueString = opValueString.substring(1);
                    break;
                case "-":
                    isPositive = false;
                    opValueString = opValueString.substring(1);
                    break;
            }

            // get the base
            let base = 10;
            let baseString = opValueString.substring(0, 2);
            let operandValue;

            switch (baseString) {
                case "0x": base = 16; break;
                case "0o": base = 8; break;
                case "0b": base = 2; break;
            }

            // read the value
            if (isPositive) {
                operandValue = Number(opValueString);
            }
            else {
                operandValue = Number(-opValueString);
            }

            if (!isNaN(operandValue)) {
                return new LoadImmediateOperand(operandValue, base);
            }
            else {
                return new LoadImmediateOperand(new BranchOperand(op.substring(1)), undefined)
            }
        }
        // LoadStoreOperand
        else {
            // check correct format
            if (op[0] !== "[" || !op.includes("]")) { return undefined; }

            // split up into pre- and postindexed parts
            let opParts = op.substring(1).split(']');
            let preIndexParts = opParts[0].split(',');
            let postIndexParts = opParts[1].split(',');

            // first part is always a register operand
            let register = this.addRegisterOperand(preIndexParts[0]);
            if (typeof register === 'undefined') { return undefined };

            let offset;
            let negativeRegOffset = false;
            let increment = false;
            let preIndexed = true;

            // preindexed
            if (preIndexParts.length > 1) {
                // check correct format
                if (opParts[1].length > 0 && !(opParts[1] === "!")) {
                    return undefined;
                }

                // check direction of offset
                let negativeRegOffsetString = preIndexParts[1][0];
                switch (negativeRegOffsetString) {
                    case "-":
                        negativeRegOffset = true;
                        preIndexParts[1] = preIndexParts[1].substring(1);
                        break;
                    case "+":
                        preIndexParts[1] = preIndexParts[1].substring(1);
                        break;
                }

                // offset can be register, immediate or shifter operand
                offset = this.addRegImmShiftOperand(preIndexParts.slice(1).join());
                if (typeof offset === 'undefined') { return undefined };

                // check if basic register should be incremented
                if (opParts[1] === "!") { increment = true; }
            }
            // postindexed
            else if (postIndexParts.length > 1) {
                // increment always true for postindexed
                increment = true;
                preIndexed = false;

                // check direction of offset
                let negativeRegOffsetString = postIndexParts[1][0];
                switch (negativeRegOffsetString) {
                    case "-":
                        negativeRegOffset = true;
                        postIndexParts[1] = postIndexParts[1].substring(1);
                        break;
                    case "+":
                        postIndexParts[1] = postIndexParts[1].substring(1);
                        break;
                }
                // offset can be register, immediate or shifter operand
                offset = this.addRegImmShiftOperand(postIndexParts.slice(1).join());
                if (typeof offset === 'undefined') { return undefined };
            }
            return new LoadStoreOperand(register, offset, negativeRegOffset, increment, preIndexed);
        }
    }

    /*
        Function to add a load/store multiple operand

        op: string | undefined
            String with the operand to add

        return: LoadStoreMultipleOperand | undefined
            An operand if it was successful, undefined otherwise
    */
    addLoadStoreMultipleOperand(op: string | undefined): LoadStoreMultipleOperand | undefined {
        // handle undefined values
        if (op === undefined) { return undefined; }

        // replace all empty characters and check format
        op = op.replace(/\s+/g, '');
        if (op[0] !== "{" && op[op.length - 1] !== "}") {
            return undefined;
        }

        // split up into individual register or register ranges
        let registersString = op.slice(1, -1).split(",");
        let registers: RegisterOperand[] = [];
        let invalidRegisters: string[] = [];

        // add each register/range
        registersString.forEach((op) => {
            // check if a range
            let splitReg = op.split("-");

            // single register
            if (splitReg.length === 1) {
                let reg = this.addRegisterOperand(splitReg[0])

                // valid register operand
                if (reg !== undefined) {
                    registers.push(reg);
                }
                // invalid operand
                else {
                    invalidRegisters.push(op);
                }
            }
            // register range
            else if (splitReg.length === 2) {
                let reg1 = this.addRegisterOperand(splitReg[0]);
                let reg2 = this.addRegisterOperand(splitReg[1]);

                // valid register range
                if (reg1 !== undefined && reg2 !== undefined && reg1.getIndex() < reg2.getIndex()) {
                    // add all register in range
                    for (let index = reg1.getIndex(); index <= reg2.getIndex(); index++) {
                        registers.push(new RegisterOperand(index))
                    }
                }
                // invalid operand
                else {
                    invalidRegisters.push(op);
                }
            }
            // unkown operand
            else {
                invalidRegisters.push(op);
            }
        })

        // print error and return undefined if there were invalid registers
        if (invalidRegisters.length > 0) {
            this.cpu.newTerminalMessage("Unknown operands: " + invalidRegisters.toString(), MessageType.Error)
            return undefined;
        }

        return new LoadStoreMultipleOperand(registers);
    }

    /*
        Function to update scroll position if the scrollbar hits the top
        or bottom.

        values: positionValues
            PositionValues automatically inserted from event.
    */
    setScroll(values: positionValues) {
        const { top } = values;

        // calculate amount of new lines to be loaded when memory scrollbar reaches top/bottom
        let newLines = Math.floor(this.preloadedMemoryLines / 2);

        // children[1] -> address in second div (breakpoint, address, encoding, instruction)

        // scrollbar at top
        if (top === 0) {
            // set focus on top element
            this.memoryPositionFocus = this.scrollRefTop.current.lastElementChild.children[1].textContent.substring(1, 9);
            // update memory position
            this.memoryPosition -= newLines * 4;
            // reload new memory lines, also updates references
            this.cpu.setState({ mainMemory: this })
            // scroll screen to correct position, so user doesn't see a change in position while
            // new lines are loaded
            if (this.scrollRefMid.current !== null) {
                this.scrollRefMid.current.scrollIntoView(true);
            }
        }
        // scrollbar at bottom
        else if (top === 1) {
            // set focus on bottom element
            this.memoryPositionFocus = this.scrollRefBot.current.lastElementChild.children[1].textContent.substring(1, 9);
            // update memory position
            this.memoryPosition += newLines * 4;
            // reload new memory lines, also updates references
            this.cpu.setState({ mainMemory: this })
                        // scroll screen to correct position, so user doesn't see a change in position while
            // new lines are loaded
            if (this.scrollRefMid.current !== null) {
                this.scrollRefMid.current.scrollIntoView(false);
            }
        }
    }

    /*
        Function to scroll a new memory address into focus
    */
    gotoMemoryAddress = () => {
        // uses value of goto field
        this.memoryPosition = this.goto;
        // update focus
        this.memoryPositionFocus = this.cpu.toHex(this.memoryPosition);
        // reload memory lines
        this.cpu.setState({ mainMemory: this })
        // scroll memory address into focus at the top
        if (this.scrollRefTop.current !== null) {
            this.scrollRefTop.current.scrollIntoView(true);
        }
    }

    /*
        Function to update value in goto field after user changes it

        e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>
            ChangeEvent when user updates text field.
    */
    gotoChange = (e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
        this.goto = parseInt('0x' + e.currentTarget.value);
        this.cpu.setState({ mainMemory: this });
    }

    // Getter and Setter
    getMemoryLines() { return this.memoryLines; }
    getLabelToAddress() { return this.labelToAddress; }
    getVariables() { return this.variables; }
    getGoto() { return this.goto; }

    setGoto(goto: number) { this.goto = goto; }
    
    /*
        Rendering of the main memory class.

        First calculates the content of the memory lines,

        then prints the header with the goto field, a clear memory button and the playground
        element,

        followed by the individual memory lines with breakpoints at the left side.
    */
    render() {
        let toHex = this.cpu.toHex;
        const items = [];

        // set address to current memory position
        let address = this.memoryPosition;
        if (address < 0) { address += 0x100000000; }

        // loop that adds the amount of preloadedMemoryLines starting at the
        // current address
        for (let index = 0; index < this.preloadedMemoryLines; index++) {
            // handle addres overflow
            if (address >= 0xffffffff) { address = 0x100000000 - address }

            let encoding = "";
            let contentString = "";
            let memoryLine = this.getMemoryLine(address);

            // get content and encoding of the memoryline
            if (typeof memoryLine !== 'undefined') {
                let content = memoryLine.getContent();

                // instruction
                if (content instanceof Instruction) {
                    encoding += this.instructionEncoder.toEncoding(content, address);
                    contentString += content.toString();
                }
                // data
                else {
                    encoding += toHex(content);
                }
            }
            // uninitilized memory lines set to 0
            else {
                this.addData(address, 0);
                encoding += "00000000"
            }

            // add all elements to output to the items
            items.push([toHex(address), encoding, contentString]);
            address += 4;
        }

        const gotoStyle = { style: { padding: 0, 'padding-left': 10, width: '100px', border: 'black solid 1px', 'margin-bottom': 2 } } as InputBaseComponentProps;

        // return div of the main memory
        return (
            <div key="memory" className="App-memory">
                <div className="App-memory-header">
                    <div className="App-memory-header-breakpoint">
                        <BreakpointDot style={{ color: 'red', padding: '2px' }} />
                    </div>
                    <div className="App-memory-header-address">Address</div>
                    <div className="App-memory-header-content">Encoding</div>
                    <div className="App-memory-header-instruction">Instruction</div>
                    <Button className="Button-goto" onClick={() => { this.gotoMemoryAddress() }} variant="outlined" color="primary">GOTO</Button>:&nbsp;
                    <InputBase inputProps={gotoStyle} value={this.cpu.toHex(this.goto)} onChange={e => this.gotoChange(e)} />  &nbsp;
                    <Button className="Button-goto" onClick={() => { this.goto = this.cpu.state.registers[13]; this.gotoMemoryAddress() }} variant="outlined" color="primary">SP</Button>
                    <Button className="Button-goto" onClick={() => { this.goto = this.cpu.state.registers[14]; this.gotoMemoryAddress() }} variant="outlined" color="primary">LR</Button>
                    <Button className="Button-goto" onClick={() => { this.goto = this.cpu.state.registers[15]; this.gotoMemoryAddress() }} variant="outlined" color="primary">PC</Button>
                    <div style={{ marginLeft: 'auto' }}>
                    <Button variant="contained" color="primary" style={{ lineHeight: '18px' }}
                            onClick={() => this.resetMemory()}>
                            Clear Memory</Button>
                        <Button variant="contained" color="primary" style={{ lineHeight: '18px' }}
                            onClick={(e: React.MouseEvent<HTMLElement, MouseEvent>) => {
                                this.cpu.setState({ anchorEl: e.currentTarget });
                            }}>
                            PlayGround</Button>
                        <Popover
                            open={Boolean(this.cpu.state.anchorEl)}
                            anchorEl={this.cpu.state.anchorEl}
                            onClose={() => this.cpu.setState({ anchorEl: null })}
                            anchorOrigin={{
                                vertical: 'bottom',
                                horizontal: 'right',
                            }}
                            transformOrigin={{
                                vertical: 'top',
                                horizontal: 'right',
                            }}
                        >
                            {this.cpu.state.playground.render()}
                        </Popover>
                    </div>
                </div>
                <Scrollbars className="App-memory-memorylines" ref={this.scrollRef} onScrollFrame={this.setScroll}>
                    <div key="memory" className="App-memory-memorylines">
                        {
                            // create div for each memory line
                            items.map((element, i) => {
                                let address = element[0];
                                let label = this.addressToLabel.get(parseInt(address, 16));
                                let labelDiv;

                                // add possible label
                                if (typeof label !== 'undefined') {
                                    labelDiv = <div style={{ display: 'flex' }}>
                                        <div className="App-memory-breakpoint"></div>
                                        <div className="App-memory-address"></div>
                                        <div key={"label" + i.toString()} className="App-memory-memoryline-label"> {label + ":"} </div>
                                    </div>;
                                }

                                // add breakpoint
                                let breakpointDiv = <div key={"breakpoint" + i.toString()} className="App-memory-breakpoint">
                                    <input type="checkbox" className="checkbox-round" checked={this.cpu.state.codeExecutionEngine.breakpoints.has(parseInt(address, 16))}
                                        onChange={(e: any) => {
                                            if (e.target.checked) {
                                                this.cpu.state.codeExecutionEngine.breakpoints.add(parseInt(e.target.id, 16));
                                            }
                                            else {
                                                this.cpu.state.codeExecutionEngine.breakpoints.delete(parseInt(e.target.id, 16));
                                            }
                                            this.cpu.setState({ codeExecutionEngine: this.cpu.state.codeExecutionEngine })
                                        }} id={address} />
                                </div>

                                // add divs for address, content and instruction
                                let addressDiv = <div key={i.toString()} className="App-memory-address"> {address} </div>
                                let contentDiv = <div key={"content" + i.toString()} className="App-memory-content"> {element[1]} </div>;
                                let instructionDiv = <div key={"instruction" + i.toString()} className="App-memory-instruction"> {element[2]} </div>;

                                // some memory lines have special meaning for scroll updates and current instruction
                                let memorylineDiv;
                                // top of the memory lines
                                if (i === 0) {
                                    memorylineDiv = <React.Fragment><div ref={this.scrollRefTop} className="App-memory-memoryline">
                                        {labelDiv}
                                        <div className="App-memory-memoryline-content">
                                            {breakpointDiv}
                                            {addressDiv}
                                            {contentDiv}
                                            {instructionDiv}
                                        </div>
                                    </div></React.Fragment>;
                                }
                                // bottom of the memory lines
                                else if (i === this.preloadedMemoryLines - 1) {
                                    memorylineDiv = <React.Fragment><div ref={this.scrollRefBot} className="App-memory-memoryline">
                                        {labelDiv}
                                        <div className="App-memory-memoryline-content">
                                            {breakpointDiv}
                                            {addressDiv}
                                            {contentDiv}
                                            {instructionDiv}
                                        </div>
                                    </div></React.Fragment>;
                                }
                                // middle of the memory lines
                                else if (address === this.memoryPositionFocus) {
                                    memorylineDiv = <React.Fragment><div ref={this.scrollRefMid} className="App-memory-memoryline">
                                        {labelDiv}
                                        <div className="App-memory-memoryline-content">
                                            {breakpointDiv}
                                            {addressDiv}
                                            {contentDiv}
                                            {instructionDiv}
                                        </div>
                                    </div></React.Fragment>;
                                }
                                // normal memory line
                                else {
                                    memorylineDiv = <React.Fragment><div className="App-memory-memoryline">
                                        {labelDiv}
                                        <div className="App-memory-memoryline-content">
                                            {breakpointDiv}
                                            {addressDiv}
                                            {contentDiv}
                                            {instructionDiv}
                                        </div>
                                    </div></React.Fragment>;
                                }

                                // highlighted memory address of current instruction
                                if (parseInt(address, 16) === this.cpu.state.registers[15]) {
                                    return <div className="App-memory-memoryline-highlight"> {memorylineDiv} </div>
                                }

                                return memorylineDiv;
                            })

                        }

                    </div>
                </Scrollbars>
            </div>
        )
    }
}


/*
    Class that defined a memory line. Can either have and instruction or
    a 32 bit number.
*/
class MemoryLine {
    private content: Instruction | number;

    constructor(content: Instruction | number) {
        this.content = content;
    }

    getContent() { return this.content };
}