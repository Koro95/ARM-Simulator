import React from "react";
import Button from '@material-ui/core/Button';
import InputBase from '@material-ui/core/InputBase';
import { InputBaseComponentProps } from "@material-ui/core";
import { positionValues, Scrollbars } from 'react-custom-scrollbars-2';
import { Cpu, MessageType } from "./Cpu";
import { Instruction, ArithmeticInstruction, LogicInstruction, CopyJumpInstruction, Operand, RegisterOperand, ImmediateOperand, ShiftOperand } from "./InstructionsAndOperands";

export { MainMemory };

class MainMemory {
    cpu: Cpu;
    memoryLines: Map<number, MemoryLine>;
    memoryString: string;
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
        this.memoryLines = new Map();
        this.memoryString = "";
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

    addInstruction(instruction: string, condition: string, updateStatusRegister: boolean,
        op1: string | undefined, op2: string | undefined, op3: string | undefined, op4: string | undefined) {

        let stringOperands = [op1, op2, op3, op4]
        let operands: (Operand | undefined)[] = [];
        let invalidOperands: string[] = [];

        stringOperands.forEach(op => {
            let newOperand;
            if (typeof op !== 'undefined' && op !== "") {
                newOperand = this.addOperand(op);
                if (typeof newOperand === 'undefined') {
                    invalidOperands.push(op);
                }
            }
            operands.push(newOperand)
        });

        if (invalidOperands.length !== 0) {
            invalidOperands.forEach(op => {
                this.cpu.newTerminalMessage(MessageType.Error, op + " is an invalind operand!");
            });
            return;
        }

        let newInstruction;

        if (["ADD", "ADC", "SUB", "SBC", "RSB", "RSC", "MUL", "MLA"].includes(instruction)) {
            newInstruction = new ArithmeticInstruction(instruction, condition, operands[0], operands[1], operands[2], operands[3], updateStatusRegister);
        }
        else if (["AND", "ORR", "EOR", "BIC", "CMP", "CMN", "TST", "TEQ"].includes(instruction)) {
            newInstruction = new LogicInstruction(instruction, condition, operands[0], operands[1], operands[2], updateStatusRegister);
        }
        else if (["MOV", "MVN", "B", "BL"].includes(instruction)) {
            newInstruction = new CopyJumpInstruction(instruction, condition, operands[0], operands[1], updateStatusRegister);
        }

        if (typeof newInstruction !== 'undefined') {
            this.memoryLines.set((this.memoryLines.size * 4), new MemoryLine(newInstruction, undefined));
        }
        else {
            this.cpu.newTerminalMessage(MessageType.Error, instruction + " is an invalid instruction!");
            return;
        }
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
            this.cpu.newTerminalMessage(MessageType.Text, shiftParts[0]);

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

        let operandType = op.substr(0, 1);
        let operandValue = Number(op.substr(1));

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
                for (let i = 0; i < 16; i++) {
                    if (((mask & operandValue) === 0) || ((mask & ~operandValue) === 0)) {
                        let backShift = 32 - 2 * i;
                        let immed8 = ((operandValue >>> backShift) | (operandValue << (32 - backShift))) >>> 0
                        return new ImmediateOperand(immed8, i);
                    }
                    mask = ((mask >>> 2) | (mask << (32 - 2))) >>> 0;
                }
        }

        return undefined;
    }

    // TODO bit 25=0, 4=1 and 7=1 -> extended instruction
    toEncoding(inst: Instruction): string {
        let encoding = "";
        encoding += ConditionEncoding.get(inst.getCondition());

        if (inst instanceof ArithmeticInstruction) {
            encoding += this.toEncodingArithmeticInstruction(inst);
        }
        else if (inst instanceof LogicInstruction) {
            encoding += this.toEncodingLogicInstruction(inst);
        }
        else if (inst instanceof CopyJumpInstruction) {
            encoding += this.toEncodingCopyJumpInstruction(inst);
        }

        return parseInt(encoding, 2).toString(16).padStart(8, "0");
    }

    toEncodingArithmeticInstruction(inst: ArithmeticInstruction): string {
        let encoding = "00"

        if (["MLA", "MUL"].includes(inst.getInstruction())) {
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

        if (["MLA", "MUL"].includes(inst.getInstruction())) {
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

        if (["AND", "BIC", "EOR", "ORR"].includes(inst.getInstruction())) {
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

    toEncodingCopyJumpInstruction(inst: CopyJumpInstruction): string {
        let encoding = "00"

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

        return encoding;
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
            console.log(this.scrollRefTop.current.textContent)
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
            let instructionString = "";
            let content = this.memoryLines.get(address);
            if (typeof content !== 'undefined') {
                let instruction = content.getContent();
                encoding += this.toEncoding(instruction);
                instructionString += instruction.toString();
            }
            else {
                encoding += "00000000"
            }
            items.push([toHex(address), encoding, instructionString]);
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
                        <div key="address">
                            {
                                items.map((element, i) => {
                                    let address = element[0];

                                    if (i === 0) {
                                        return <div ref={this.scrollRefTop} key={i.toString()} className="App-memory-address"> {address} </div>
                                    }
                                    else if (i === this.preloadedMemoryLines - 1) {
                                        return <div ref={this.scrollRefBot} key={i.toString()} className="App-memory-address"> {address} </div>
                                    }
                                    else if (address === this.memoryPositionFocus) {
                                        return <div ref={this.scrollRefMid} key={i.toString()} className="App-memory-address"> {address} </div>
                                    }

                                    return <div key={i.toString()} className="App-memory-address"> {address} </div>
                                })

                            }
                        </div>
                        <div key="encoding">
                            {
                                items.map((element, i) => {
                                    return <div key={i.toString()} className="App-memory-content"> {element[1]} </div>
                                })

                            }
                        </div>
                        <div key="instruction">
                            {
                                items.map((element, i) => {
                                    return <div key={i.toString()} className="App-memory-instruction"> {element[2]} </div>
                                })

                            }
                        </div>
                    </div>
                </Scrollbars>
            </div>
        )
    }

    setScroll(values: positionValues) {
        const { top } = values;
        let newLines = Math.floor(this.preloadedMemoryLines / 2);

        if (top === 0) {
            this.memoryPositionFocus = this.scrollRefTop.current.textContent.substring(1, 9);
            this.memoryPosition -= newLines * 4;
            this.compile();
            if (this.scrollRefMid.current !== null) {
                this.scrollRefMid.current.scrollIntoView(true);
            }
        }
        else if (top === 1) {
            this.memoryPositionFocus = this.scrollRefBot.current.textContent.substring(1, 9);
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
    content: Instruction;
    label: string | undefined;

    constructor(content: Instruction, label: string | undefined) {
        this.content = content;
        this.label = label;
    }

    getContent() { return this.content };
    getLabel() { return this.label };
}

const ConditionEncoding = new Map([
    ["EQ", "0000"],
    ["NE", "0001"],
    ["HS", "0010"],
    ["CS", "0010"],
    ["LO", "0011"],
    ["CC", "0011"],
    ["MI", "0100"],
    ["PL", "0101"],
    ["VS", "0110"],
    ["VC", "0111"],
    ["HI", "1000"],
    ["LS", "1001"],
    ["GE", "1010"],
    ["LT", "1011"],
    ["GT", "1100"],
    ["LE", "1101"],
    ["AL", "1110"],
    ["", "1110"],
    ["NV", "1111"]
]);

const InstructionEncoding = new Map([
    ["ADC", "0101"],
    ["ADD", "0100"],
    ["MLA", "0001"],
    ["MUL", "0000"],
    ["RSB", "0011"],
    ["RSC", "0111"],
    ["SBC", "0110"],
    ["SUB", "0010"],
    ["AND", "0000"],
    ["BIC", "1110"],
    ["CMN", "1011"],
    ["CMP", "1010"],
    ["EOR", "0001"],
    ["ORR", "1100"],
    ["TEQ", "1001"],
    ["TST", "1000"],
    ["MOV", "1101"],
    ["MVN", "1111"]
]);