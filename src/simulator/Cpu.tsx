import React from "react";
import InputBase from '@material-ui/core/InputBase';
import { InputBaseComponentProps } from "@material-ui/core";
import Box from '@material-ui/core/Box';
import Button from '@material-ui/core/Button';
import Checkbox from '@material-ui/core/Checkbox';
import { Tab, Tabs, TabList, TabPanel } from 'react-tabs';
import 'react-tabs/style/react-tabs.css';

import { CodeExecutionEngine } from "./CodeExecutionEngine";
import { StatusRegister } from "./StatusRegister";
import { MainMemory } from "./MainMemory";

const parse = require('../parser/parser').parse;

export { Cpu, MessageType };

enum MessageType {
    Text,
    Warning,
    Error
}

type CpuState = {
    registers: number[];
    statusRegister: StatusRegister;
    codeExecutionEngine: CodeExecutionEngine;
    userInput: String;
    terminal: Terminal;
    mainMemory: MainMemory;
    testOp: string[];
    cond: string;
    S: boolean;
}

class Cpu extends React.Component<any, CpuState> {
    constructor(props: any) {
        super(props)
        let defaultValue = 0x00000000;
        let initializedRegisters = []
        let welcomeMessage = "<" + new Date().toLocaleTimeString() + "> Welcome";

        for (let index = 0; index < 16; index++) {
            initializedRegisters.push(defaultValue);
        }
        this.state = {
            registers: initializedRegisters, statusRegister: new StatusRegister(),
            codeExecutionEngine: new CodeExecutionEngine(this), userInput: ".arm\n.text\n.global _start\n_start:\n\tADD r1, r2, r3",
            terminal: new Terminal(welcomeMessage), mainMemory: new MainMemory(this), testOp: ["r0", "r1", "r2", "r3"], cond: "", S: false
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

        newRegisters[index] = (parseInt('0x' + newValue));
        this.setState({ registers: newRegisters });
    }

    testOpChange = (index: number, e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
        let newTestOp = [...this.state.testOp];
        newTestOp[index] = e.currentTarget.value;
        this.setState({ testOp: newTestOp });
    }

    checkConditionAndOperands(numOfOperands: number) {
        let check = true;

        for (let index = 0; index < numOfOperands; index++) {
            if (this.state.testOp[index] === "") {
                this.newTerminalMessage(MessageType.Error, "More operands needed!")
                check = false;
                break;
            }
        }

        if (!["", "EQ", "NE", "HS", "CS", "LO", "CC", "MI", "PL", "VS", "VC", "HI", "LS", "GE", "LT", "GT", "LE", "AL", "NV"].includes(this.state.cond)) {
            this.newTerminalMessage(MessageType.Error, "Invalid Condition")
            check = false;
        }

        return check;
    }

    newTerminalMessage(type: MessageType, message: string) {
        let newMessage = "\n<" + new Date().toLocaleTimeString() + "> " + message;
        this.state.terminal.addMessage(type, newMessage);
        this.setState({ terminal: this.state.terminal })
    }

    toHex(x: number): String {
        return ('00000000' + x.toString(16)).slice(-8);
    }

    render() {
        const style = { style: { padding: 0, 'padding-left': 10, width: '90px' } } as InputBaseComponentProps;
        const testOperandsStyle = { style: { padding: 0, 'padding-left': 10, width: '100px', border: 'black solid 1px', 'margin-bottom': 2 } } as InputBaseComponentProps;

        return (
            <div className="App-body">
                <Box width="19.75%" mr="0.5%" height="100%" minWidth="150px">
                    <Box height="54%" mb="0.5%" className="App-cpustate">
                        <Tabs>
                            <TabList className="tab-list-reg">
                                <Tab>Register</Tab>
                                <Tab>Stack</Tab>
                            </TabList>

                            <TabPanel>
                                <div className="Reg"> <div className="Reg-names">r0</div><InputBase inputProps={style} value={this.toHex(this.state.registers[0])} onChange={e => this.regValueChange(0, e)} /> </div>
                                <div className="Reg"> <div className="Reg-names">r1</div><InputBase inputProps={style} value={this.toHex(this.state.registers[1])} onChange={e => this.regValueChange(1, e)} /> </div>
                                <div className="Reg"> <div className="Reg-names">r2</div><InputBase inputProps={style} value={this.toHex(this.state.registers[2])} onChange={e => this.regValueChange(2, e)} /> </div>
                                <div className="Reg"> <div className="Reg-names">r3</div><InputBase inputProps={style} value={this.toHex(this.state.registers[3])} onChange={e => this.regValueChange(3, e)} /> </div>
                                <div className="Reg"> <div className="Reg-names">r4</div><InputBase inputProps={style} value={this.toHex(this.state.registers[4])} onChange={e => this.regValueChange(4, e)} /> </div>
                                <div className="Reg"> <div className="Reg-names">r5</div><InputBase inputProps={style} value={this.toHex(this.state.registers[5])} onChange={e => this.regValueChange(5, e)} /> </div>
                                <div className="Reg"> <div className="Reg-names">r6</div><InputBase inputProps={style} value={this.toHex(this.state.registers[6])} onChange={e => this.regValueChange(6, e)} /> </div>
                                <div className="Reg"> <div className="Reg-names">r7</div><InputBase inputProps={style} value={this.toHex(this.state.registers[7])} onChange={e => this.regValueChange(7, e)} /> </div>
                                <div className="Reg"> <div className="Reg-names">r8</div><InputBase inputProps={style} value={this.toHex(this.state.registers[8])} onChange={e => this.regValueChange(8, e)} /> </div>
                                <div className="Reg"> <div className="Reg-names">r9</div><InputBase inputProps={style} value={this.toHex(this.state.registers[9])} onChange={e => this.regValueChange(9, e)} /> </div>
                                <div className="Reg"> <div className="Reg-names">r10</div><InputBase inputProps={style} value={this.toHex(this.state.registers[10])} onChange={e => this.regValueChange(10, e)} /> </div>
                                <div className="Reg"> <div className="Reg-names">r11</div><InputBase inputProps={style} value={this.toHex(this.state.registers[11])} onChange={e => this.regValueChange(11, e)} /> </div>
                                <div className="Reg"> <div className="Reg-names">r12</div><InputBase inputProps={style} value={this.toHex(this.state.registers[12])} onChange={e => this.regValueChange(12, e)} /> </div>
                                <div className="Reg"> <div className="Reg-names">sp</div><InputBase inputProps={style} value={this.toHex(this.state.registers[13])} onChange={e => this.regValueChange(13, e)} /> </div>
                                <div className="Reg"> <div className="Reg-names">lr</div><InputBase inputProps={style} value={this.toHex(this.state.registers[14])} onChange={e => this.regValueChange(14, e)} /> </div>
                                <div className="Reg"> <div className="Reg-names">pc</div><InputBase inputProps={style} value={this.toHex(this.state.registers[15])} onChange={e => this.regValueChange(15, e)} /> </div>
                            </TabPanel>
                            <TabPanel>
                                hallo
                            </TabPanel>
                        </Tabs>
                    </Box>
                    <Box height="25.25%" mb="0.5%" className="App-debugger">
                        <div>N: {this.state.statusRegister.getN()}, Z: {this.state.statusRegister.getZ()}, C: {this.state.statusRegister.getC()}, V: {this.state.statusRegister.getV()}</div>

                        <div>Op1: <InputBase inputProps={testOperandsStyle} value={this.state.testOp[0]} onChange={e => this.testOpChange(0, e)} /> &nbsp;
                            Op2: <InputBase inputProps={testOperandsStyle} value={this.state.testOp[1]} onChange={e => this.testOpChange(1, e)} /> </div>
                        <div>Op3: <InputBase inputProps={testOperandsStyle} value={this.state.testOp[2]} onChange={e => this.testOpChange(2, e)} /> &nbsp;
                            Op4: <InputBase inputProps={testOperandsStyle} value={this.state.testOp[3]} onChange={e => this.testOpChange(3, e)} /> </div>
                        <div>Cond: <InputBase inputProps={testOperandsStyle} value={this.state.cond} onChange={e => this.setState({ cond: e.currentTarget.value })} /> &nbsp;
                            S: <Checkbox checked={this.state.S} onChange={e => this.setState({ S: e.currentTarget.checked })} color="primary" /> </div>
                        <Button onClick={() => this.state.codeExecutionEngine.executeNextInstruction()} variant="outlined" color="primary">NextInst</Button> &nbsp;
                        <Button onClick={() => this.state.mainMemory.compile()} variant="outlined" color="primary">Compile Memory</Button>
                    </Box>
                    <Box height="19.75%" className="App-options">
                        <div>Options</div>
                        <div>
                            <Button onClick={() => {
                                if (this.checkConditionAndOperands(2)) {
                                    this.state.mainMemory.addInstruction("MOV", this.state.cond, this.state.S, this.state.testOp[0], this.state.testOp[1], undefined, undefined)
                                }
                            }} variant="outlined" color="primary">MOV</Button>
                            <Button onClick={() => {
                                if (this.checkConditionAndOperands(2)) {
                                    this.state.mainMemory.addInstruction("MVN", this.state.cond, this.state.S, this.state.testOp[0], this.state.testOp[1], undefined, undefined)
                                }
                            }} variant="outlined" color="primary">MVN</Button>
                        </div>
                        <div>
                            <Button onClick={() => {
                                if (this.checkConditionAndOperands(2)) {
                                    this.state.mainMemory.addInstruction("AND", this.state.cond, this.state.S, this.state.testOp[0], this.state.testOp[1], this.state.testOp[2], undefined)
                                }
                            }} variant="outlined" color="primary">AND</Button>
                            <Button onClick={() => {
                                if (this.checkConditionAndOperands(2)) {
                                    this.state.mainMemory.addInstruction("ORR", this.state.cond, this.state.S, this.state.testOp[0], this.state.testOp[1], this.state.testOp[2], undefined)
                                }
                            }} variant="outlined" color="primary">ORR</Button>
                            <Button onClick={() => {
                                if (this.checkConditionAndOperands(2)) {
                                    this.state.mainMemory.addInstruction("EOR", this.state.cond, this.state.S, this.state.testOp[0], this.state.testOp[1], this.state.testOp[2], undefined)
                                }
                            }} variant="outlined" color="primary">EOR</Button>
                            <Button onClick={() => {
                                if (this.checkConditionAndOperands(2)) {
                                    this.state.mainMemory.addInstruction("BIC", this.state.cond, this.state.S, this.state.testOp[0], this.state.testOp[1], this.state.testOp[2], undefined)
                                }
                            }} variant="outlined" color="primary">BIC</Button>
                            <Button onClick={() => {
                                if (this.checkConditionAndOperands(2)) {
                                    this.state.mainMemory.addInstruction("CMP", this.state.cond, this.state.S, this.state.testOp[0], this.state.testOp[1], undefined, undefined)
                                }
                            }} variant="outlined" color="primary">CMP</Button>
                            <Button onClick={() => {
                                if (this.checkConditionAndOperands(2)) {
                                    this.state.mainMemory.addInstruction("CMN", this.state.cond, this.state.S, this.state.testOp[0], this.state.testOp[1], undefined, undefined)
                                }
                            }} variant="outlined" color="primary">CMN</Button>
                            <Button onClick={() => {
                                if (this.checkConditionAndOperands(2)) {
                                    this.state.mainMemory.addInstruction("TST", this.state.cond, this.state.S, this.state.testOp[0], this.state.testOp[1], undefined, undefined)
                                }
                            }} variant="outlined" color="primary">TST</Button>
                            <Button onClick={() => {
                                if (this.checkConditionAndOperands(2)) {
                                    this.state.mainMemory.addInstruction("TEQ", this.state.cond, this.state.S, this.state.testOp[0], this.state.testOp[1], undefined, undefined)
                                }
                            }} variant="outlined" color="primary">TEQ</Button>
                        </div>
                        <div>
                            <Button onClick={() => {
                                if (this.checkConditionAndOperands(2)) {
                                    this.state.mainMemory.addInstruction("ADD", this.state.cond, this.state.S, this.state.testOp[0], this.state.testOp[1], this.state.testOp[2], undefined)
                                }
                            }} variant="outlined" color="primary">ADD</Button>
                            <Button onClick={() => {
                                if (this.checkConditionAndOperands(2)) {
                                    this.state.mainMemory.addInstruction("ADC", this.state.cond, this.state.S, this.state.testOp[0], this.state.testOp[1], this.state.testOp[2], undefined)
                                }
                            }} variant="outlined" color="primary">ADC</Button>
                            <Button onClick={() => {
                                if (this.checkConditionAndOperands(2)) {
                                    this.state.mainMemory.addInstruction("SUB", this.state.cond, this.state.S, this.state.testOp[0], this.state.testOp[1], this.state.testOp[2], undefined)
                                }
                            }} variant="outlined" color="primary">SUB</Button>
                            <Button onClick={() => {
                                if (this.checkConditionAndOperands(2)) {
                                    this.state.mainMemory.addInstruction("SBC", this.state.cond, this.state.S, this.state.testOp[0], this.state.testOp[1], this.state.testOp[2], undefined)
                                }
                            }} variant="outlined" color="primary">SBC</Button>
                            <Button onClick={() => {
                                if (this.checkConditionAndOperands(2)) {
                                    this.state.mainMemory.addInstruction("RSB", this.state.cond, this.state.S, this.state.testOp[0], this.state.testOp[1], this.state.testOp[2], undefined)
                                }
                            }} variant="outlined" color="primary">RSB</Button>
                            <Button onClick={() => {
                                if (this.checkConditionAndOperands(2)) {
                                    this.state.mainMemory.addInstruction("RSC", this.state.cond, this.state.S, this.state.testOp[0], this.state.testOp[1], this.state.testOp[2], undefined)
                                }
                            }} variant="outlined" color="primary">RSC</Button>
                            <Button onClick={() => {
                                if (this.checkConditionAndOperands(2)) {
                                    this.state.mainMemory.addInstruction("MUL", this.state.cond, this.state.S, this.state.testOp[0], this.state.testOp[1], this.state.testOp[2], undefined)
                                }
                            }} variant="outlined" color="primary">MUL</Button>
                            <Button onClick={() => {
                                if (this.checkConditionAndOperands(4)) {
                                    this.state.mainMemory.addInstruction("MLA", this.state.cond, this.state.S, this.state.testOp[0], this.state.testOp[1], this.state.testOp[2], this.state.testOp[3])
                                }
                            }} variant="outlined" color="primary">MLA</Button>
                        </div>
                    </Box>
                </Box>
                <Box width="79.75%" height="100%">
                    <Box height="79.5%" mb="0.5%">
                        <Tabs height="100%">
                            <TabList className="tab-list-input">
                                <Tab height="5%">Code</Tab>
                                <Tab>Memory</Tab>
                            </TabList>

                            <TabPanel>
                                <textarea className="App-userinput" value={this.state.userInput.toString()} onChange={e => this.userInputChange(e)} onKeyDown={e => this.allowTabKey(e)} />
                            </TabPanel>
                            <TabPanel>
                                {this.state.mainMemory.render()}
                            </TabPanel>
                        </Tabs>
                    </Box>
                    <Box height="19.5%">
                        {this.state.terminal.render()}
                    </Box>
                </Box>
            </div>
        )
    }
}

class Terminal {
    messages: [MessageType, string][];

    constructor(welcomeMessage: string) {
        this.messages = [[MessageType.Text, welcomeMessage,]];
    }

    addMessage(type: MessageType, message: string) {
        this.messages.push([type, message])
    }

    render() {
        return (<Box className="App-terminal" >
            {this.messages.map(message => {
                switch (message[0]) {
                    case MessageType.Text: return <div className="App-terminal-content App-terminal-text"> {message[1]} </div>
                    case MessageType.Warning: return <div className="App-terminal-content App-terminal-warning"> {message[1]} </div>
                    case MessageType.Error: return <div className="App-terminal-content App-terminal-error"> {message[1]} </div>
                }
                return undefined;
            })
            }
        </Box>)
    }
}