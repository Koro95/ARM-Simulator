import React from "react";
import Button from '@material-ui/core/Button';
import InputBase from '@material-ui/core/InputBase';
import { InputBaseComponentProps } from "@material-ui/core";
import { positionValues, Scrollbars } from 'react-custom-scrollbars-2';
import { Cpu, MessageType } from "./Cpu";
import { InstructionEncoder } from "./InstructionEncoder";
import { Instruction, ArithmeticInstruction, LogicInstruction, CopyJumpInstruction, Operand, RegisterOperand, ImmediateOperand, ShiftOperand, BranchOperand } from "./InstructionsAndOperands";

export { MainMemory };

class MainMemory {
    cpu: Cpu;
    instructionEncoder: InstructionEncoder;
    memoryLines: Map<number, MemoryLine>;
    labelToAddress: Map<string, number>;
    addressToLabel: Map<number, string>;
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

    addInstruction(instruction: string, condition: string, updateStatusRegister: boolean,
        op1: string | undefined, op2: string | undefined, op3: string | undefined, op4: string | undefined): boolean {

        let stringOperands = [op1, op2, op3, op4]
        let operands: (Operand | undefined)[] = [];
        let invalidOperands: string[] = [];

        stringOperands.forEach(op => {
            let newOperand;
            if (typeof op !== 'undefined' && op !== "") {
                if (["b", "bl"].includes(instruction)) {
                    newOperand = new BranchOperand(op);
                }
                else {
                    newOperand = this.addOperand(op);
                    if (typeof newOperand === 'undefined') {
                        invalidOperands.push(op);
                    }
                }
            }
            operands.push(newOperand)
        });

        if (invalidOperands.length !== 0) {
            invalidOperands.forEach(op => {
                this.cpu.newTerminalMessage(MessageType.Error, op + " is an invalind operand!");
            });
            return false;
        }

        let newInstruction;

        if (["add", "adc", "sub", "sbc", "rsb", "rsc", "mul", "mla"].includes(instruction)) {
            newInstruction = new ArithmeticInstruction(instruction, condition, operands[0], operands[1], operands[2], operands[3], updateStatusRegister);
        }
        else if (["and", "orr", "eor", "bic", "cmp", "cmn", "tst", "teq"].includes(instruction)) {
            newInstruction = new LogicInstruction(instruction, condition, operands[0], operands[1], operands[2], updateStatusRegister);
        }
        else if (["mov", "mvn", "b", "bl"].includes(instruction)) {
            newInstruction = new CopyJumpInstruction(instruction, condition, operands[0], operands[1], updateStatusRegister);
        }

        if (typeof newInstruction !== 'undefined') {
            this.memoryLines.set((this.memoryLines.size * 4), new MemoryLine(newInstruction, undefined));
        }
        else {
            this.cpu.newTerminalMessage(MessageType.Error, instruction + " is an invalid instruction!");
            return false;
        }
        return true;
    }

    addLabel(address: number, label: string): boolean {

        if (typeof this.labelToAddress.get(label) !== 'undefined') {
            this.cpu.newTerminalMessage(MessageType.Error, label + " already exists!");
            return false;
        }
        else if (typeof this.addressToLabel.get(address) !== 'undefined') {
            this.cpu.newTerminalMessage(MessageType.Error, this.cpu.toHex(address) + " already has a label!");
            return false;
        }
        this.labelToAddress.set(label, address);
        this.addressToLabel.set(address, label);

        return true;
    }

    addData(address: number, data: number): boolean {
        if (this.memoryLines.get(address)?.getContent() instanceof Instruction) {
            this.cpu.newTerminalMessage(MessageType.Error, this.cpu.toHex(address) + " is a Code Section!");
            return false;
        }

        this.memoryLines.set(address, new MemoryLine(data, undefined))
        return true;
    }

    addOperand(op: string): Operand | undefined {

        // split in case of ShiftOperand
        let opParts = op.split(/,[ ]+/)

        // invalid or nested ShiftOperand not allowed
        let operand1 = this.checkValidOperand(opParts[0]);
        if (typeof operand1 === 'undefined' || operand1 instanceof ShiftOperand) {
            return undefined;
        }

        // case op = ShiftOperand
        if (opParts.length > 1) {
            let shiftParts = opParts[1].split(/[ ]+/);

            // invalid or nested ShiftOperand not allowed
            let operand2 = this.checkValidOperand(shiftParts[1])
            if (typeof operand2 === 'undefined' || operand2 instanceof ShiftOperand) {
                return undefined;
            }

            return new ShiftOperand(operand1, shiftParts[0], operand2);
        }
        // case op != ShiftOperand
        else {
            return operand1;
        }
    }

    checkValidOperand(op: string): Operand | undefined {
        switch (op) {
            case "sp": return new RegisterOperand(13);
            case "lr": return new RegisterOperand(14);
            case "pc": return new RegisterOperand(15);
        }

        let operandType = op.substring(0, 1);
        let operandValue = Number(op.substring(1));

        if (isNaN(operandValue)) {
            return undefined;
        }

        switch (operandType) {
            case "r":
                if (operandValue >= 0 && operandValue < 16) {
                    return new RegisterOperand(operandValue);
                }
                break;
            case "#":
                let mask = 0xffffff00
                let base = 10;
                let baseString = op.substring(1,3);
                switch (baseString) {
                    case "0x": base = 16; break;
                    case "0b": base = 2; break;
                }

                for (let i = 0; i < 16; i++) {
                    if ((mask & operandValue) === 0) {
                        let backShift = 32 - 2 * i;
                        let immed8 = ((operandValue >>> backShift) | (operandValue << (32 - backShift))) >>> 0
                        return new ImmediateOperand(immed8, i, base);
                    }
                    if ((mask & ~operandValue) === 0) {
                        let backShift = 32 - 2 * i;
                        let immed8 = ((~operandValue >>> backShift) | (~operandValue << (32 - backShift))) >>> 0
                        return new ImmediateOperand(immed8, i, base);
                    }
                    mask = ((mask >>> 2) | (mask << (32 - 2))) >>> 0;
                }
        }

        return undefined;
    }

    gotoChange = (e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
        this.goto = parseInt('0x' + e.currentTarget.value);
        this.cpu.setState({ mainMemory: this });
    }

    gotoMemoryAddress = () => {
        this.memoryPosition = this.goto;
        this.memoryPositionFocus = this.cpu.toHex(this.memoryPosition);
        this.compile();
        if (this.scrollRefTop.current !== null) {
            this.scrollRefTop.current.scrollIntoView(true);
        }
    }

    render() {
        let toHex = this.cpu.toHex;
        const items = [];

        let address = this.memoryPosition;
        if (address < 0) { address = 0x100000000 + address; }

        for (let index = 0; index < this.preloadedMemoryLines; index++) {
            if (address >= 0xffffffff) { address = 0x100000000 - address };
            let encoding = "";
            let contentString = "";
            let memoryLine = this.memoryLines.get(address);
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
                encoding += "00000000"
            }
            items.push([toHex(address), encoding, contentString]);
            address += 4;
        }

        const gotoStyle = { style: { padding: 0, 'padding-left': 10, width: '100px', border: 'black solid 1px', 'margin-bottom': 2 } } as InputBaseComponentProps;

        return (
            <div key="memory" className="App-memory">
                <div className="App-memory-header">
                    <div className="App-memory-header-address">Address</div>
                    <div className="App-memory-header-content">Encoding</div>
                    <div className="App-memory-header-instruction">Instruction</div>
                    <Button className="Button-goto" onClick={() => { this.gotoMemoryAddress() }} variant="outlined" color="primary">GOTO</Button>:&nbsp;
                    <InputBase inputProps={gotoStyle} value={this.cpu.toHex(this.goto)} onChange={e => this.gotoChange(e)} />  &nbsp;
                    <Button className="Button-goto" onClick={() => { this.goto = this.cpu.state.registers[13]; this.gotoMemoryAddress() }} variant="outlined" color="primary">SP</Button>
                    <Button className="Button-goto" onClick={() => { this.goto = this.cpu.state.registers[14]; this.gotoMemoryAddress() }} variant="outlined" color="primary">LR</Button>
                    <Button className="Button-goto" onClick={() => { this.goto = this.cpu.state.registers[15]; this.gotoMemoryAddress() }} variant="outlined" color="primary">PC</Button>
                </div>
                <Scrollbars className="App-memory-memorylines" ref={this.scrollRef} onScrollFrame={this.setScroll}>
                    <div key="memory" className="App-memory-memorylines">
                        {
                            items.map((element, i) => {
                                let address = element[0];
                                let label = this.addressToLabel.get(parseInt(address, 16));
                                let labelDiv;

                                if (typeof label !== 'undefined') {
                                    labelDiv = <div key={"label" + i.toString()} className="App-memory-memoryline-label"> {label + ":"} </div>;
                                }

                                let addressDiv = <div key={i.toString()} className="App-memory-address"> {address} </div>
                                let contentDiv = <div key={"content" + i.toString()} className="App-memory-content"> {element[1]} </div>;
                                let instructionDiv = <div key={"instrcution" + i.toString()} className="App-memory-instruction"> {element[2]} </div>;

                                let memorylineDiv;
                                if (i === 0) {
                                    memorylineDiv = <React.Fragment><div ref={this.scrollRefTop} className="App-memory-memoryline">
                                        {labelDiv}
                                        <div className="App-memory-memoryline-content">
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

        if (top === 0) {
            this.memoryPositionFocus = this.scrollRefTop.current.lastElementChild.firstElementChild.textContent.substring(1, 9);
            this.memoryPosition -= newLines * 4;
            this.compile();
            if (this.scrollRefMid.current !== null) {
                this.scrollRefMid.current.scrollIntoView(true);
            }
        }
        else if (top === 1) {
            this.memoryPositionFocus = this.scrollRefBot.current.lastElementChild.firstElementChild.textContent.substring(1, 9);
            this.memoryPosition += newLines * 4;
            this.compile();
            if (this.scrollRefMid.current !== null) {
                this.scrollRefMid.current.scrollIntoView(false);
            }
        }
    }

    compile() {
        this.cpu.setState({ mainMemory: this })
    }
}

class MemoryLine {
    private content: Instruction | number;
    private label: string | undefined;

    constructor(content: Instruction | number, label: string | undefined) {
        this.content = content;
        this.label = label;
    }

    getContent() { return this.content };
    getLabel() { return this.label };
}