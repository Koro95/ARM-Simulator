import React from "react";
import InputBase from '@material-ui/core/InputBase';
import Box from '@material-ui/core/Box';
import Button from '@material-ui/core/Button';
import { Tab, Tabs, TabList, TabPanel } from 'react-tabs';
import 'react-tabs/style/react-tabs.css';

import { CodeExecutionEngine } from "./CodeExecutionEngine";
import { StatusRegister } from "./StatusRegister";
import { MainMemory } from "./MainMemory";

const parse = require('../parser/parser').parse;

export { Cpu };

type CpuState = {
    registers: number[];
    statusRegister: StatusRegister;
    codeExecutionEngine: CodeExecutionEngine;
    userInput: String;
    terminal: String;
    mainMemory: MainMemory;
    testOp: number[];
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
            terminal: welcomeMessage, mainMemory: new MainMemory(this), testOp : [0,1,2,3]
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
        console.log(e.target.value)
        let newValue = parseInt(e.currentTarget.value);
        if (newValue == null || newValue > 15 ) {
            let message = "\n<" + new Date().toLocaleTimeString() + "> Register Value should be < 15 and a number";
            let newTerminal = this.state.terminal + message;
            this.setState({ terminal: newTerminal })
            return;
        }
        else if (isNaN(newValue)) {
            let newTestOp = [...this.state.testOp];
            newTestOp[index] = 0;
            this.setState({ testOp: newTestOp });
            return;
        }

        let newTestOp = [...this.state.testOp];
        newTestOp[index] = newValue;
        this.setState({ testOp: newTestOp });
    }

    toHex(x: number): String {
        return ('00000000' + x.toString(16)).slice(-8);
    }

    render() {
        return (
            <div className="App-body">
                <Box width="19.75%" mr="0.5%" height="100%">
                    <Box height="50%" mb="0.5%" className="App-cpustate">
                        <div> <div className="Reg-names">r0</div> <InputBase margin='none' value={this.toHex(this.state.registers[0])} onChange={e => this.regValueChange(0, e)} /> </div>
                        <div> <div className="Reg-names">r1</div> <InputBase margin='none' value={this.toHex(this.state.registers[1])} onChange={e => this.regValueChange(1, e)} /> </div>
                        <div> <div className="Reg-names">r2</div> <InputBase margin='none' value={this.toHex(this.state.registers[2])} onChange={e => this.regValueChange(2, e)} /> </div>
                        <div> <div className="Reg-names">r3</div> <InputBase margin='none' value={this.toHex(this.state.registers[3])} onChange={e => this.regValueChange(3, e)} /> </div>
                        <div> <div className="Reg-names">r4</div> <InputBase margin='none' value={this.toHex(this.state.registers[4])} onChange={e => this.regValueChange(4, e)} /> </div>
                        <div> <div className="Reg-names">r5</div> <InputBase margin='none' value={this.toHex(this.state.registers[5])} onChange={e => this.regValueChange(5, e)} /> </div>
                        <div> <div className="Reg-names">r6</div> <InputBase margin='none' value={this.toHex(this.state.registers[6])} onChange={e => this.regValueChange(6, e)} /> </div>
                        <div> <div className="Reg-names">r7</div> <InputBase margin='none' value={this.toHex(this.state.registers[7])} onChange={e => this.regValueChange(7, e)} /> </div>
                        <div> <div className="Reg-names">r8</div> <InputBase margin='none' value={this.toHex(this.state.registers[8])} onChange={e => this.regValueChange(8, e)} /> </div>
                        <div> <div className="Reg-names">r9</div> <InputBase margin='none' value={this.toHex(this.state.registers[9])} onChange={e => this.regValueChange(9, e)} /> </div>
                        <div> <div className="Reg-names">r10</div> <InputBase margin='none' value={this.toHex(this.state.registers[10])} onChange={e => this.regValueChange(10, e)} /> </div>
                        <div> <div className="Reg-names">r11</div> <InputBase margin='none' value={this.toHex(this.state.registers[11])} onChange={e => this.regValueChange(11, e)} /> </div>
                        <div> <div className="Reg-names">r12</div> <InputBase margin='none' value={this.toHex(this.state.registers[12])} onChange={e => this.regValueChange(12, e)} /> </div>
                        <div> <div className="Reg-names">sp</div> <InputBase margin='none' value={this.toHex(this.state.registers[13])} onChange={e => this.regValueChange(13, e)} /> </div>
                        <div> <div className="Reg-names">lr</div> <InputBase margin='none' value={this.toHex(this.state.registers[14])} onChange={e => this.regValueChange(14, e)} /> </div>
                        <div> <div className="Reg-names">pc</div> <InputBase margin='none' value={this.toHex(this.state.registers[15])} onChange={e => this.regValueChange(15, e)} /> </div>
                    </Box>
                    <Box height="29.75%" mb="0.5%" className="App-debugger">
                        <div>N: {this.state.statusRegister.getN()}, Z: {this.state.statusRegister.getZ()}, C: {this.state.statusRegister.getC()}, V: {this.state.statusRegister.getV()}</div>
                        
                        <div>Op1: <InputBase value={this.state.testOp[0]} onChange={e => this.testOpChange(0, e)} /> </div>
                        <div>Op2: <InputBase value={this.state.testOp[1]} onChange={e => this.testOpChange(1, e)} /> </div>
                        <div>Op3: <InputBase value={this.state.testOp[2]} onChange={e => this.testOpChange(2, e)} /> </div>
                        <div>Op4: <InputBase value={this.state.testOp[3]} onChange={e => this.testOpChange(3, e)} /> </div>                      
                        
                        <Button onClick={() => this.state.codeExecutionEngine.executeNextInstruction()} variant="outlined" color="primary">NextInst</Button>
                        <Button onClick={() => this.state.mainMemory.compile()} variant="outlined" color="primary">Compile Memory</Button>
                    </Box>
                    <Box height="19.75%" className="App-options">
                        <div>Options</div>
                        <div>
                            <Button onClick={() => this.state.mainMemory.addInstruction("AND", "log", this.state.testOp[0], this.state.testOp[1], this.state.testOp[2], undefined, undefined)} variant="outlined" color="primary">AND</Button>
                            <Button onClick={() => this.state.mainMemory.addInstruction("ORR", "log", this.state.testOp[0], this.state.testOp[1], this.state.testOp[2], undefined, undefined)} variant="outlined" color="primary">ORR</Button>
                            <Button onClick={() => this.state.mainMemory.addInstruction("EOR", "log", this.state.testOp[0], this.state.testOp[1], this.state.testOp[2], undefined, undefined)} variant="outlined" color="primary">EOR</Button>
                            <Button onClick={() => this.state.mainMemory.addInstruction("BIC", "log", this.state.testOp[0], this.state.testOp[1], this.state.testOp[2], undefined, undefined)} variant="outlined" color="primary">BIC</Button>
                            <Button onClick={() => this.state.mainMemory.addInstruction("CMP", "log", this.state.testOp[0], this.state.testOp[1], undefined, undefined, undefined)} variant="outlined" color="primary">CMP</Button>
                            <Button onClick={() => this.state.mainMemory.addInstruction("CMN", "log", this.state.testOp[0], this.state.testOp[1], undefined, undefined, undefined)} variant="outlined" color="primary">CMN</Button>
                            <Button onClick={() => this.state.mainMemory.addInstruction("TST", "log", this.state.testOp[0], this.state.testOp[1], undefined, undefined, undefined)} variant="outlined" color="primary">TST</Button>
                            <Button onClick={() => this.state.mainMemory.addInstruction("TEQ", "log", this.state.testOp[0], this.state.testOp[1], undefined, undefined, undefined)} variant="outlined" color="primary">TEQ</Button>
                        </div>
                        <div>
                            <Button onClick={() => this.state.mainMemory.addInstruction("ADD", "art", this.state.testOp[0], this.state.testOp[1], this.state.testOp[2], undefined, undefined)} variant="outlined" color="primary">ADD</Button>
                            <Button onClick={() => this.state.mainMemory.addInstruction("ADC", "art", this.state.testOp[0], this.state.testOp[1], this.state.testOp[2], undefined, undefined)} variant="outlined" color="primary">ADC</Button>
                            <Button onClick={() => this.state.mainMemory.addInstruction("SUB", "art", this.state.testOp[0], this.state.testOp[1], this.state.testOp[2], undefined, undefined)} variant="outlined" color="primary">SUB</Button>
                            <Button onClick={() => this.state.mainMemory.addInstruction("SBC", "art", this.state.testOp[0], this.state.testOp[1], this.state.testOp[2], undefined, undefined)} variant="outlined" color="primary">SBC</Button>
                            <Button onClick={() => this.state.mainMemory.addInstruction("RSB", "art", this.state.testOp[0], this.state.testOp[1], this.state.testOp[2], undefined, undefined)} variant="outlined" color="primary">RSB</Button>
                            <Button onClick={() => this.state.mainMemory.addInstruction("RSC", "art", this.state.testOp[0], this.state.testOp[1], this.state.testOp[2], undefined, undefined)} variant="outlined" color="primary">RSC</Button>
                            <Button onClick={() => this.state.mainMemory.addInstruction("MUL", "art", this.state.testOp[0], this.state.testOp[1], this.state.testOp[2], undefined, undefined)} variant="outlined" color="primary">MUL</Button>
                            <Button onClick={() => this.state.mainMemory.addInstruction("MLA", "art", this.state.testOp[0], this.state.testOp[1], this.state.testOp[2], this.state.testOp[3], undefined)} variant="outlined" color="primary">MLA</Button>
                        </div>
                    </Box>
                </Box>
                <Box width="79.75%" height="100%">
                    <Box height="79.5%" mb="0.5%">
                        <Tabs>
                            <TabList height="10%">
                                <Tab>Code</Tab>
                                <Tab>Memory</Tab>
                            </TabList>

                            <TabPanel height="90%">
                                <textarea className="App-userinput" value={this.state.userInput.toString()} onChange={e => this.userInputChange(e)} onKeyDown={e => this.allowTabKey(e)} />
                            </TabPanel>
                            <TabPanel height="90%">
                                <textarea className="App-userinput" value={this.state.mainMemory.memory} disabled />
                            </TabPanel>
                        </Tabs>
                    </Box>
                    <Box height="19.5%">
                        <textarea className="App-terminal" value={this.state.terminal.toString()} disabled />
                    </Box>
                </Box>
            </div>
        )
    }
}