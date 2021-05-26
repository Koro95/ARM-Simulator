import React from "react";
import InputBase from '@material-ui/core/InputBase';
import Box from '@material-ui/core/Box';
import Button from '@material-ui/core/Button';

const parse = require('./parser/parser').parse;

export { Cpu }

type CpuState = {
    registers: Register[];
    statusRegister: StatusRegister;
    codeExecutionEngine: CodeExecutionEngine;
    userInput: String;
    terminal: String;
}

class Cpu extends React.Component<any, CpuState> {
    constructor(props: any) {
        super(props)
        let defaultValue = 0x00000001;
        let initializedRegisters = []
        let welcomeMessage = "<" + new Date().toLocaleTimeString() + "> Welcome";

        for (let index = 0; index < 16; index++) {
            initializedRegisters.push(new Register(defaultValue));
        }
        this.state = {
            registers: initializedRegisters, statusRegister: new StatusRegister(),
            codeExecutionEngine: new CodeExecutionEngine(this), userInput: ".arm\n.text\n.global _start\n_start:\n\tADD r1, r2, r3",
            terminal: welcomeMessage
        };
    }

    userInputChange = (e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
        let newValue = e.currentTarget.value;

        this.setState({ userInput: newValue });
    }

    allowTabKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Tab') {
            if (!e.shiftKey) {
                e.preventDefault();

                let x = (e.target as HTMLInputElement);
                const selectionStart = x.selectionStart;
                const selectionEnd = x.selectionEnd;

                if (selectionStart != null && selectionEnd != null) {
                    let newUserInput = this.state.userInput.substring(0, selectionStart)
                        + "\t" + this.state.userInput.substring(selectionEnd);

                    this.setState({ userInput: newUserInput },
                        () => {
                            x.selectionStart = x.selectionEnd = selectionStart + 1
                            e.target = x
                        });
                }
            }
            else {
                e.preventDefault();
            }
        }
    }

    regValueChange = (index: number, e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
        let newValue = e.currentTarget.value;
        let newRegisters = [...this.state.registers];

        newRegisters[index].setValue(parseInt('0x' + newValue));
        this.setState({ registers: newRegisters });
    }

    render() {
        return (
            <div className="App-body">
                <Box width="19.75%" mr="0.5%" height="100%">
                    <Box height="50%" mb="0.5%" className="App-cpustate">
                        <div> <div className="Reg-names">r0</div> <InputBase margin='none' value={this.state.registers[0].toHex()} onChange={e => this.regValueChange(0, e)} /> </div>
                        <div> <div className="Reg-names">r1</div> <InputBase margin='none' value={this.state.registers[1].toHex()} onChange={e => this.regValueChange(1, e)} /> </div>
                        <div> <div className="Reg-names">r2</div> <InputBase margin='none' value={this.state.registers[2].toHex()} onChange={e => this.regValueChange(2, e)} /> </div>
                        <div> <div className="Reg-names">r3</div> <InputBase margin='none' value={this.state.registers[3].toHex()} onChange={e => this.regValueChange(3, e)} /> </div>
                        <div> <div className="Reg-names">r4</div> <InputBase margin='none' value={this.state.registers[4].toHex()} onChange={e => this.regValueChange(4, e)} /> </div>
                        <div> <div className="Reg-names">r5</div> <InputBase margin='none' value={this.state.registers[5].toHex()} onChange={e => this.regValueChange(5, e)} /> </div>
                        <div> <div className="Reg-names">r6</div> <InputBase margin='none' value={this.state.registers[6].toHex()} onChange={e => this.regValueChange(6, e)} /> </div>
                        <div> <div className="Reg-names">r7</div> <InputBase margin='none' value={this.state.registers[7].toHex()} onChange={e => this.regValueChange(7, e)} /> </div>
                        <div> <div className="Reg-names">r8</div> <InputBase margin='none' value={this.state.registers[8].toHex()} onChange={e => this.regValueChange(8, e)} /> </div>
                        <div> <div className="Reg-names">r9</div> <InputBase margin='none' value={this.state.registers[9].toHex()} onChange={e => this.regValueChange(9, e)} /> </div>
                        <div> <div className="Reg-names">r10</div> <InputBase margin='none' value={this.state.registers[10].toHex()} onChange={e => this.regValueChange(10, e)} /> </div>
                        <div> <div className="Reg-names">r11</div> <InputBase margin='none' value={this.state.registers[11].toHex()} onChange={e => this.regValueChange(11, e)} /> </div>
                        <div> <div className="Reg-names">r12</div> <InputBase margin='none' value={this.state.registers[12].toHex()} onChange={e => this.regValueChange(12, e)} /> </div>
                        <div> <div className="Reg-names">sp</div> <InputBase margin='none' value={this.state.registers[13].toHex()} onChange={e => this.regValueChange(13, e)} /> </div>
                        <div> <div className="Reg-names">lr</div> <InputBase margin='none' value={this.state.registers[14].toHex()} onChange={e => this.regValueChange(14, e)} /> </div>
                        <div> <div className="Reg-names">pc</div> <InputBase margin='none' value={this.state.registers[15].toHex()} onChange={e => this.regValueChange(15, e)} /> </div>
                    </Box>
                    <Box height="29.75%" mb="0.5%" className="App-debugger">
                        <div>N: {this.state.statusRegister.getN()}, Z: {this.state.statusRegister.getZ()}, C: {this.state.statusRegister.getC()}, V {this.state.statusRegister.getV()}</div>
                        <Button onClick={() => this.state.codeExecutionEngine.executeNextInstruction()} variant="outlined" color="primary">NextInst</Button>
                    </Box>
                    <Box height="19.75%" className="App-options">
                        <div>Options</div>
                        <div>
                            <Button onClick={() => this.state.codeExecutionEngine.addInstruction("CMP", "log", 0, 1, undefined, undefined)} variant="outlined" color="primary">CMP</Button>
                        </div>
                        <div>
                            <Button onClick={() => this.state.codeExecutionEngine.addInstruction("ADD", "art", 0, 1, 2, undefined)} variant="outlined" color="primary">ADD</Button>
                            <Button onClick={() => this.state.codeExecutionEngine.addInstruction("ADC", "art", 0, 1, 2, undefined)} variant="outlined" color="primary">ADC</Button>
                            <Button onClick={() => this.state.codeExecutionEngine.addInstruction("SUB", "art", 0, 1, 2, undefined)} variant="outlined" color="primary">SUB</Button>
                            <Button onClick={() => this.state.codeExecutionEngine.addInstruction("SBC", "art", 0, 1, 2, undefined)} variant="outlined" color="primary">SBC</Button>
                            <Button onClick={() => this.state.codeExecutionEngine.addInstruction("RSB", "art", 0, 1, 2, undefined)} variant="outlined" color="primary">RSB</Button>
                            <Button onClick={() => this.state.codeExecutionEngine.addInstruction("RSC", "art", 0, 1, 2, undefined)} variant="outlined" color="primary">RSC</Button>
                            <Button onClick={() => this.state.codeExecutionEngine.addInstruction("MUL", "art", 0, 1, 2, undefined)} variant="outlined" color="primary">MUL</Button>
                            <Button onClick={() => this.state.codeExecutionEngine.addInstruction("MLA", "art", 0, 1, 2, 3)} variant="outlined" color="primary">MLA</Button>
                        </div>
                    </Box>
                </Box>
                <Box width="79.75%" height="100%">
                    <Box height="79.5%" mb="0.5%">
                        <textarea className="App-userinput" value={this.state.userInput.toString()} onChange={e => this.userInputChange(e)} onKeyDown={e => this.allowTabKey(e)} />
                    </Box>
                    <Box height="19.5%">
                        <textarea className="App-terminal" value={this.state.terminal.toString()} disabled />
                    </Box>
                </Box>
            </div>
        )
    }
}

class CodeExecutionEngine {
    cpu: Cpu;
    instructions: Instruction[];
    instructionIndex: number;

    constructor(cpu: Cpu) {
        this.cpu = cpu;
        this.instructions = [];
        this.instructionIndex = 0;
    }

    addInstruction(instruction: string, type: string, y: number | undefined, a: number | undefined, b: number | undefined, x: number | undefined) {
        let newInstruction = new Instruction(this, instruction, type, y, a, b, x);
        this.instructions.push(newInstruction);
    }

    executeNextInstruction() {
        let currentInstruction = this.instructions[this.instructionIndex];
        if (typeof currentInstruction !== 'undefined') {
            currentInstruction.executeInstruction();
            this.instructionIndex++;
        }
        else {
            let message = "\n<" + new Date().toLocaleTimeString() + "> Instructions finished!";
            let newTerminal = this.cpu.state.terminal + message;
            this.cpu.setState({ terminal: newTerminal })
        }
    }
}

class Instruction {
    codeExecutionEngine: CodeExecutionEngine;
    instruction: string;
    type: string;
    op1: number | undefined;
    op2: number | undefined;
    op3: number | undefined;
    op4: number | undefined;

    constructor(codeExecutionEngine: CodeExecutionEngine, instruction: string, type: string, op1: number | undefined, op2: number | undefined,
        op3: number | undefined, op4: number | undefined) {
        this.codeExecutionEngine = codeExecutionEngine;
        this.instruction = instruction;
        this.type = type;
        this.op1 = op1;
        this.op2 = op2;
        this.op3 = op3;
        this.op4 = op4;
    }

    executeInstruction() {
        switch (this.type) {
            case "art":
                if (typeof this.op1 !== 'undefined' && typeof this.op2 !== 'undefined' && typeof this.op3 !== 'undefined') {
                    let newRegisters = [...this.codeExecutionEngine.cpu.state.registers];

                    let result = this.arithmetic(newRegisters[this.op2].getValue(), newRegisters[this.op3].getValue(),
                        (typeof this.op4 !== 'undefined') ? newRegisters[this.op4].getValue() : this.op4);
                    if (typeof result !== 'undefined') {
                        newRegisters[this.op1].setValue(this.setTo32Bit(result));
                    }

                    this.codeExecutionEngine.cpu.setState({ registers: newRegisters });
                }
                break;
            case "log":
                if (typeof this.op1 !== 'undefined' && typeof this.op2 !== 'undefined') {
                    let newRegisters = [...this.codeExecutionEngine.cpu.state.registers];

                    if (typeof this.op3 !== 'undefined') {
                        let result = this.logical(newRegisters[this.op2].getValue(), newRegisters[this.op3].getValue());
                        if (typeof result !== 'undefined') {
                            newRegisters[this.op1].setValue(this.setTo32Bit(result));
                            this.codeExecutionEngine.cpu.setState({ registers: newRegisters });
                        }
                    }
                    else {
                        let result = this.logical(newRegisters[this.op1].getValue(), newRegisters[this.op2].getValue());
                        if (typeof result !== 'undefined') {
                            let newStatusRegister = this.codeExecutionEngine.cpu.state.statusRegister;
                            newStatusRegister.updateFlagsArithmetic(result);
                            this.codeExecutionEngine.cpu.setState({ statusRegister: newStatusRegister });
                        }
                    }
                }
        }
    }

    arithmetic(a: number, b: number, x?: number): number | undefined {
        switch (this.instruction) {
            case "ADD": return (a + b);
            case "ADC": return (a + b + this.codeExecutionEngine.cpu.state.statusRegister.getC());
            case "SUB": return (a - b);
            case "SBC": return (a - b + this.codeExecutionEngine.cpu.state.statusRegister.getC() - 1);
            case "RSB": return (b - a);
            case "RSC": return (b - a + this.codeExecutionEngine.cpu.state.statusRegister.getC() - 1);
            case "MUL": return (a * b);
            case "MLA": return ((typeof x !== 'undefined') ? (a * b) + x : undefined);
        }

        return undefined;
    }

    logical(a: number, b: number): number | undefined {
        switch (this.instruction) {
            case "AND":
            case "TST": return (a & b);
            case "ORR": return (a | b);
            case "EOR":
            case "TEQ": return (a ^ b);
            case "BIC": return (a & (~b));
            case "CMP": return (a - b);
            case "CMN": return (a + b);
        }

        return undefined;
    }


    setTo32Bit(x: number): number {
        x = x << 32;
        x = x >>> 32;
        return x;
    }
}

class Register {
    value: number;

    constructor(value: number) {
        this.value = value;
    }

    toHex() {
        return ('00000000' + this.value.toString(16)).slice(-8)
    }

    setValue(value: number) {
        this.value = value;
    }
    getValue(): number {
        return this.value;
    }
}

class StatusRegister {
    flags: number[];

    constructor() {
        this.flags = [0, 0, 0, 0]
    }

    updateFlagsArithmetic(x: number) {
        this.setN(((x & 0x80000000) === 0) ? 0 : 1);
        this.setZ(((x & 0x00000000) === 0) ? 1 : 0);
        this.setC(((x >>> 32) === 0) ? 0 : 1);
        //TODO: OVERFLOW FLAG, DIFFERENT SUBTRACTION WITH OVERFLOW IN INSTRUCTION
    }

    setN(x: number) {
        this.flags[0] = x;
    }
    getN(): number {
        return this.flags[0];
    }

    setZ(x: number) {
        this.flags[1] = x;
    }
    getZ(): number {
        return this.flags[1];
    }

    setC(x: number) {
        this.flags[2] = x;
    }
    getC(): number {
        return this.flags[2];
    }

    setV(x: number) {
        this.flags[3] = x;
    }
    getV(): number {
        return this.flags[3];
    }
}