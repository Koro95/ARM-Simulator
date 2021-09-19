import React from "react";
import Button from '@material-ui/core/Button';
import InputBase from '@material-ui/core/InputBase';
import { InputBaseComponentProps, Popover } from "@material-ui/core";
import BreakpointDot from '@material-ui/icons/Brightness1Rounded';
import { positionValues, Scrollbars } from 'react-custom-scrollbars-2';
import { Cpu, MessageType } from "./Cpu";
import { InstructionEncoder } from "./InstructionEncoder";
import { Instruction, ArithmeticInstruction, LogicInstruction, CopyInstruction, JumpInstruction, LoadStoreInstruction, MultiplicationInstruction, SoftwareInterrupt, LoadStoreMultipleInstruction } from "./Instructions";
import { RegisterOperand, ImmediateOperand, ShifterOperand, BranchOperand, LoadStoreOperand, LoadImmediateOperand, LoadStoreMultipleOperand } from './Operands';

export { MainMemory };


class MainMemory {
    cpu: Cpu;
    instructionEncoder: InstructionEncoder;
    memoryLines: Map<number, MemoryLine>;
    labelToAddress: Map<string, number>;
    addressToLabel: Map<number, string>;
    variables: Map<string, number>;
    scrollRef: React.RefObject<Scrollbars>;
    scrollRefTop: React.RefObject<any>;
    scrollRefMid: React.RefObject<any>;
    scrollRefBot: React.RefObject<any>;
    memoryPosition: number;
    memoryPositionFocus: string;
    preloadedMemoryLines: number;
    goto: number;


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

    resetMemory() {
        this.memoryLines = new Map();
        this.labelToAddress = new Map();
        this.addressToLabel = new Map();
        this.memoryPosition = 0x00000000;
        this.memoryPositionFocus = this.cpu.toHex(this.memoryPosition);
        this.goto = 0x00000000;

        let newRegisters = [...this.cpu.state.registers];
        newRegisters[15] = 0;
        this.cpu.setState({ registers: newRegisters });

    }

    getMemoryLine(address: number): MemoryLine {
        let memoryLine = this.memoryLines.get(address);

        if (memoryLine === undefined) {
            memoryLine = new MemoryLine(0, undefined);
        }

        return memoryLine;
    }

    addInstruction(instruction: string, condition: string, updateStatusRegister: boolean,
        op1String: string | undefined, op2String: string | undefined, op3String: string | undefined,
        op4String: string | undefined, address?: number): boolean {

        instruction = instruction.toLowerCase();
        condition = condition.toLowerCase();
        op1String = op1String?.toLowerCase();
        op2String = op2String?.toLowerCase();
        op3String = op3String?.toLowerCase();
        op4String = op4String?.toLowerCase();

        let invalidOperands: (string | undefined)[] = [];

        let newInstruction;

        if (["add", "adc", "sub", "sbc", "rsb", "rsc"].includes(instruction)) {
            let op1 = this.addRegisterOperand(op1String);
            let op2 = this.addRegImmShiftOperand(op2String);
            let op3 = this.addRegImmShiftOperand(op3String);

            if (op1 !== undefined && op2 !== undefined) {
                if (op3 !== undefined) {
                    newInstruction = new ArithmeticInstruction(instruction, condition, op1, op2, op3, updateStatusRegister);
                }
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
        else if (["mul", "mla"].includes(instruction)) {
            let op1 = this.addRegisterOperand(op1String);
            let op2 = this.addRegisterOperand(op2String);
            let op3 = this.addRegisterOperand(op3String);
            let op4 = this.addRegisterOperand(op4String);

            if (op1 !== undefined && op2 !== undefined && op3 !== undefined) {
                if (instruction === "mul") {
                    newInstruction = new MultiplicationInstruction(instruction, condition, op1, op2, op3, undefined, updateStatusRegister);
                }
                else if (op4 !== undefined) {
                    newInstruction = new MultiplicationInstruction(instruction, condition, op1, op2, op3, op4, updateStatusRegister);
                }
                // "mla" and op4String undefined
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
        else if (["and", "orr", "eor", "bic"].includes(instruction)) {
            let op1 = this.addRegisterOperand(op1String);
            let op2 = this.addRegImmShiftOperand(op2String);
            let op3 = this.addRegImmShiftOperand(op3String);

            if (op1 !== undefined && op2 !== undefined) {
                if (op3 !== undefined) {
                    newInstruction = new LogicInstruction(instruction, condition, op1, op2, op3, updateStatusRegister);
                }
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
        else if (["cmp", "cmn", "tst", "teq"].includes(instruction)) {
            let op1 = this.addRegisterOperand(op1String);
            let op2 = this.addRegImmShiftOperand(op2String);

            if (op1 !== undefined && op2 !== undefined) {
                newInstruction = new LogicInstruction(instruction, condition, op1, op2, undefined, true);
            }
            // operands undefined
            else {
                if (op1 === undefined) { invalidOperands.push(op1String) }
                if (op2 === undefined) { invalidOperands.push(op2String) }
            }
        }
        else if (["mov", "mvn"].includes(instruction)) {
            let op1 = this.addRegisterOperand(op1String);
            let op2 = this.addRegImmShiftOperand(op2String);

            if (op1 !== undefined && op2 !== undefined) {
                newInstruction = new CopyInstruction(instruction, condition, op1, op2, updateStatusRegister);
            }
            // operands undefined
            else {
                if (op1 === undefined) { invalidOperands.push(op1String) }
                if (op2 === undefined) { invalidOperands.push(op2String) }
            }
        }
        else if (["b", "bl"].includes(instruction)) {
            if (op1String !== undefined) {
                let op1 = new BranchOperand(op1String);
                newInstruction = new JumpInstruction(instruction, condition, op1, updateStatusRegister);
            }
            else {
                invalidOperands.push(op1String);
            }
        }
        else if (["ldr", "str", "swp"].includes(instruction.substring(0, 3))) {
            let inst = instruction.substring(0, 3)
            let format = instruction.substring(3);
            if (["b", "h", "sb", "sh", ""].includes(format)) {
                if ((inst === "str" && ["sb", "sh"].includes(format)) || (inst === "swp" && ["h", "sb", "sh"].includes(format))) {
                    // only ldr has all formats
                }
                else {
                    let op1 = this.addRegisterOperand(op1String);
                    let op2 = this.addLoadStoreOperand(op2String);
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
        else if (["ldm", "stm"].includes(instruction.substring(0, 3))) {
            let increment = false;
            if (op1String !== undefined && op1String[op1String.length - 1] === "!") {
                increment = true;
                op1String = op1String.slice(0, -1);
            }

            let op1 = this.addRegisterOperand(op1String);
            let op2 = this.addLoadStoreMultipleOperand(op2String);

            let addressingMode = instruction.substring(3);
            let validAddressingMode = ["fa", "ea", "fd", "ed", "ia", "ib", "da", "db", ""].includes(addressingMode)

            if (op1 !== undefined && op2 !== undefined && validAddressingMode) {
                newInstruction = new LoadStoreMultipleInstruction(instruction.substring(0, 3), condition, op1, op2, addressingMode, increment, updateStatusRegister);
            }
            // operands undefined
            else {
                if (op1 === undefined || !validAddressingMode) { invalidOperands.push(op1String) }
                if (op2 === undefined) { invalidOperands.push(op2String) }
            }
        }
        else if (["swi"].includes(instruction)) {
            newInstruction = new SoftwareInterrupt(instruction, condition, false);
        }

        if (invalidOperands.length !== 0) {
            invalidOperands.forEach(op => {
                this.cpu.newTerminalMessage(op + " is an invalid operand!", MessageType.Error);
            })
            return false;
        }

        if (typeof newInstruction !== 'undefined') {
            if (address !== undefined) {
                if (address % 4 === 0) {
                    this.memoryLines.set(address, new MemoryLine(newInstruction, undefined));
                }
                else {
                    this.cpu.newTerminalMessage("Address not aligned!", MessageType.Error)
                    return false;
                }
            }
            else {
                this.memoryLines.set((this.memoryLines.size * 4), new MemoryLine(newInstruction, undefined));
            }
        }
        else {
            this.cpu.newTerminalMessage(instruction + " is an invalid instruction!", MessageType.Error);
            return false;
        }

        return true;
    }

    addLabel(address: number, label: string): boolean {
        if (address % 4 !== 0) {
            this.cpu.newTerminalMessage("Address not aligned!", MessageType.Error);
            return false;
        }

        if (typeof this.labelToAddress.get(label) !== 'undefined') {
            this.cpu.newTerminalMessage(label + " already exists!", MessageType.Error);
            return false;
        }
        else if (typeof this.addressToLabel.get(address) !== 'undefined') {
            this.cpu.newTerminalMessage(this.cpu.toHex(address) + " already has a label!", MessageType.Error);
            return false;
        }
        this.labelToAddress.set(label, address);
        this.addressToLabel.set(address, label);

        return true;
    }

    addData(address: number, data: number): boolean {
        if (this.getMemoryLine(address).getContent() instanceof Instruction) {
            this.cpu.newTerminalMessage(this.cpu.toHex(address) + " is a Code Section!", MessageType.Error);
            return false;
        }

        this.memoryLines.set(address, new MemoryLine(data, undefined))
        return true;
    }

    addRegImmShiftOperand(op: string | undefined): RegisterOperand | ImmediateOperand | ShifterOperand | undefined {
        if (op === undefined) { return undefined; }
        op = op.replace(/\s+/g, '');

        if (op.split(',').length > 1) { return this.addShifterOperand(op) }
        else { return this.addRegImmOperand(op) }
    }

    addRegImmOperand(op: string | undefined): RegisterOperand | ImmediateOperand | undefined {
        if (op === undefined) { return undefined; }
        op = op.replace(/\s+/g, '');

        switch (op.substring(0, 1)) {
            case "#": return this.addImmediateOperand(op);
            default: return this.addRegisterOperand(op);;
        }
    }

    addRegisterOperand(op: string | undefined): RegisterOperand | undefined {
        if (op === undefined) { return undefined; }
        op = op.replace(/\s+/g, '');

        switch (op) {
            case "sp": return new RegisterOperand(13);
            case "lr": return new RegisterOperand(14);
            case "pc": return new RegisterOperand(15);
        }

        if (op.substring(0, 1) !== "r") { return undefined; }

        let index = Number(op.substring(1));
        if (index >= 0 && index < 16 && !isNaN(index)) {
            return new RegisterOperand(index);
        }

        return undefined;
    }

    addImmediateOperand(op: string | undefined): ImmediateOperand | undefined {
        if (op === undefined) { return undefined; }
        op = op.replace(/\s+/g, '');

        if (op.substring(0, 1) !== "#") { return undefined; }

        let operandValueString = op.substring(1);

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

        let base = 10;
        let baseString = operandValueString.substring(0, 2);
        let operandValue;

        switch (baseString) {
            case "0x": base = 16; break;
            case "0o": base = 8; break;
            case "0b": base = 2; break;
        }

        if (isPositive) {
            operandValue = Number(operandValueString);
        }
        else {
            operandValue = Number(-operandValueString);
        }

        if (isNaN(operandValue)) {
            return undefined;
        }

        let mask = 0xffffff00
        for (let i = 0; i < 16; i++) {
            if ((mask & operandValue) === 0) {
                let backShift = 32 - 2 * i;
                let immed8 = ((operandValue >>> backShift) | (operandValue << (32 - backShift))) >>> 0
                return new ImmediateOperand(immed8, i, base);
            }
            if ((mask & ~operandValue) === 0) {
                let backShift = 32 - 2 * i;
                let immed8 = ((~operandValue >>> backShift) | (~operandValue << (32 - backShift))) >>> 0
                return new ImmediateOperand(~immed8, i, base);
            }
            mask = ((mask >>> 2) | (mask << (32 - 2))) >>> 0;
        }


        return undefined;
    }

    addShifterOperand(op: string | undefined): ShifterOperand | undefined {
        if (op === undefined) { return undefined; }
        op = op.replace(/\s+/g, '');

        let opParts = op.split(',')

        let operand1 = this.addRegImmOperand(opParts[0]);
        if (operand1 === undefined) { return undefined; }

        let shiftType = opParts[1].substring(0, 3);
        if (!["lsl", "asl", "lsr", "asr", "ror", "rrx"].includes(shiftType)) { return undefined; }

        let shifterOperand = opParts[1].substring(3);

        // invalid or nested ShifertOperand not allowed
        let operand2 = this.addRegImmOperand(shifterOperand)
        if (operand2 === undefined) { return undefined; }
        if (operand2 instanceof ImmediateOperand && operand2.getValue() > 31) { return undefined; }

        return new ShifterOperand(operand1, shiftType, operand2);
    }

    addLoadStoreOperand(op: string | undefined): LoadStoreOperand | LoadImmediateOperand | undefined {
        if (op === undefined) { return undefined; }
        op = op.replace(/\s+/g, '');

        if (op[0] === "=") {
            let opValueString = op.substring(1);

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

            let base = 10;
            let baseString = opValueString.substring(0, 2);
            let operandValue;

            switch (baseString) {
                case "0x": base = 16; break;
                case "0o": base = 8; break;
                case "0b": base = 2; break;
            }

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
        else {
            if (op[0] !== "[" || !op.includes("]")) { return undefined; }

            let opParts = op.substring(1).split(']');
            let preIndexParts = opParts[0].split(',');
            let postIndexParts = opParts[1].split(',');

            let register = this.addRegisterOperand(preIndexParts[0]);
            if (typeof register === 'undefined') { return undefined };

            let offset;
            let negativeRegOffset = false;
            let increment = false;
            let preIndexed = true;

            // preindexed
            if (preIndexParts.length > 1) {
                if (opParts[1].length > 0 && !(opParts[1] === "!")) {
                    return undefined;
                }

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
                offset = this.addRegImmShiftOperand(preIndexParts.slice(1).join());
                if (typeof offset === 'undefined') { return undefined };
                if (opParts[1] === "!") { increment = true; }
            }
            // postindexed
            else if (postIndexParts.length > 1) {
                increment = true;
                preIndexed = false;
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
                offset = this.addRegImmShiftOperand(postIndexParts.slice(1).join());
                if (typeof offset === 'undefined') { return undefined };
            }
            return new LoadStoreOperand(register, offset, negativeRegOffset, increment, preIndexed);
        }
    }

    addLoadStoreMultipleOperand(op: string | undefined): LoadStoreMultipleOperand | undefined {
        if (op === undefined) { return undefined; }

        op = op.replace(/\s+/g, '');
        if (op[0] !== "{" && op[op.length - 1] !== "}") {
            return undefined;
        }

        let registersString = op.slice(1, -1).split(",");
        let registers: RegisterOperand[] = [];
        let invalidRegisters: string[] = [];

        registersString.forEach((op) => {
            let splitReg = op.split("-");

            // single register
            if (splitReg.length === 1) {
                let reg = this.addRegisterOperand(splitReg[0])

                if (reg !== undefined) {
                    registers.push(reg);
                }
                else {
                    invalidRegisters.push(op);
                }
            }
            // register range
            else if (splitReg.length === 2) {
                let reg1 = this.addRegisterOperand(splitReg[0]);
                let reg2 = this.addRegisterOperand(splitReg[1]);

                if (reg1 !== undefined && reg2 !== undefined && reg1.getIndex() < reg2.getIndex()) {
                    registers.push(reg1);
                    for (let index = reg1.getIndex() + 1; index < reg2.getIndex(); index++) {
                        registers.push(new RegisterOperand(index))
                    }
                    registers.push(reg2);
                }
                else {
                    invalidRegisters.push(op);
                }
            }
            // unkown operand
            else {
                invalidRegisters.push(op);
            }
        })

        if (invalidRegisters.length > 0) {
            this.cpu.newTerminalMessage("Unknown operands: " + invalidRegisters.toString(), MessageType.Error)
            return undefined;
        }

        return new LoadStoreMultipleOperand(registers);
    }

    render() {
        let toHex = this.cpu.toHex;
        const items = [];

        let address = this.memoryPosition;
        if (address < 0) { address += 0x100000000; }

        for (let index = 0; index < this.preloadedMemoryLines; index++) {
            if (address >= 0xffffffff) { address = 0x100000000 - address }
            let encoding = "";
            let contentString = "";
            let memoryLine = this.getMemoryLine(address);
            if (typeof memoryLine !== 'undefined') {
                let content = memoryLine.getContent();
                if (content instanceof Instruction) {
                    encoding += this.instructionEncoder.toEncoding(content, address);
                    contentString += content.toString();
                }
                else {
                    encoding += toHex(content);
                }
            }
            else {
                this.addData(address, 0);
                encoding += "00000000"
            }
            items.push([toHex(address), encoding, contentString]);
            address += 4;
        }

        const gotoStyle = { style: { padding: 0, 'padding-left': 10, width: '100px', border: 'black solid 1px', 'margin-bottom': 2 } } as InputBaseComponentProps;

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
                            items.map((element, i) => {
                                let address = element[0];
                                let label = this.addressToLabel.get(parseInt(address, 16));
                                let labelDiv;

                                if (typeof label !== 'undefined') {
                                    labelDiv = <div style={{ display: 'flex' }}>
                                        <div className="App-memory-breakpoint"></div>
                                        <div className="App-memory-address"></div>
                                        <div key={"label" + i.toString()} className="App-memory-memoryline-label"> {label + ":"} </div>
                                    </div>;
                                }

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
                                let addressDiv = <div key={i.toString()} className="App-memory-address"> {address} </div>
                                let contentDiv = <div key={"content" + i.toString()} className="App-memory-content"> {element[1]} </div>;
                                let instructionDiv = <div key={"instruction" + i.toString()} className="App-memory-instruction"> {element[2]} </div>;

                                let memorylineDiv;
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

    setScroll(values: positionValues) {
        const { top } = values;
        let newLines = Math.floor(this.preloadedMemoryLines / 2);
        // children[1] -> address in second div (breakpoint, address, encoding, instruction)
        if (top === 0) {
            this.memoryPositionFocus = this.scrollRefTop.current.lastElementChild.children[1].textContent.substring(1, 9);
            this.memoryPosition -= newLines * 4;
            this.cpu.setState({ mainMemory: this })
            if (this.scrollRefMid.current !== null) {
                this.scrollRefMid.current.scrollIntoView(true);
            }
        }
        else if (top === 1) {
            this.memoryPositionFocus = this.scrollRefBot.current.lastElementChild.children[1].textContent.substring(1, 9);
            this.memoryPosition += newLines * 4;
            this.cpu.setState({ mainMemory: this })
            if (this.scrollRefMid.current !== null) {
                this.scrollRefMid.current.scrollIntoView(false);
            }
        }
    }

    gotoChange = (e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
        this.goto = parseInt('0x' + e.currentTarget.value);
        this.cpu.setState({ mainMemory: this });
    }

    gotoMemoryAddress = () => {
        this.memoryPosition = this.goto;
        this.memoryPositionFocus = this.cpu.toHex(this.memoryPosition);
        this.cpu.setState({ mainMemory: this })
        if (this.scrollRefTop.current !== null) {
            this.scrollRefTop.current.scrollIntoView(true);
        }
    }
}

class MemoryLine {
    private content: Instruction | number;
    private comment: string | undefined;

    constructor(content: Instruction | number, comment: string | undefined) {
        this.content = content;
        this.comment = comment;
    }

    getContent() { return this.content };
    getComment() { return this.comment };
}