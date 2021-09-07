import { examples } from '../parser/examples/examples'
import React from "react";
import InputBase from '@material-ui/core/InputBase';
import { FormControl, InputBaseComponentProps, InputLabel, MenuItem, Select } from "@material-ui/core";
import Box from '@material-ui/core/Box';
import Button from '@material-ui/core/Button';
import { Tab, Tabs, TabList, TabPanel } from 'react-tabs';
import 'react-tabs/style/react-tabs.css';

import { CodeExecutionEngine } from "./CodeExecutionEngine";
import { StatusRegister } from "./StatusRegister";
import { MainMemory } from "./MainMemory";
import { UserInputParser } from './UserInputParser';
import { Playground } from './Playground';

export { Cpu, MessageType };

enum MessageType {
    Text,
    Warning,
    Error
}

enum DebuggerSpeed {
    Instant,
    Slow = 300,
    Medium = 100,
    Fast = 10
}

type CpuState = {
    registers: number[];
    statusRegister: StatusRegister;
    codeExecutionEngine: CodeExecutionEngine;
    userInput: String;
    terminal: Terminal;
    mainMemory: MainMemory;
    userInputParser: UserInputParser;
    playground: Playground;
    tab: number;
    tabExample: number;
}

class Cpu extends React.Component<any, CpuState> {
    constructor(props: any) {
        super(props)
        let defaultValue = 0x00000000;
        let welcomeMessage = "<" + new Date().toLocaleTimeString() + "> Welcome";
        let startingExample = 1;

        let initializedRegisters = []
        for (let index = 0; index < 16; index++) {
            initializedRegisters.push(defaultValue);
        }

        this.state = {
            registers: initializedRegisters, statusRegister: new StatusRegister(),
            codeExecutionEngine: new CodeExecutionEngine(this), userInput: examples[startingExample][1], terminal: new Terminal(welcomeMessage), mainMemory: new MainMemory(this),
            userInputParser: new UserInputParser(this), playground: new Playground(this), tab: 0, tabExample: startingExample
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

    newTerminalMessage(type: MessageType, message: string) {
        let newMessage = "\n<" + new Date().toLocaleTimeString() + "> " + message;
        this.state.terminal.addMessage(type, newMessage);
        this.setState({ terminal: this.state.terminal })
    }

    componentDidUpdate() {
        let scroll = this.state.terminal.scrollRef.current;
        scroll.scrollTop = scroll.scrollHeight - scroll.clientHeight;
    }

    toHex(x: number): string {
        return ('00000000' + x.toString(16)).slice(-8);
    }

    resetRegister() {
        let defaultValue = 0x00000000;
        let initializedRegisters = []
        for (let index = 0; index < 16; index++) {
            initializedRegisters.push(defaultValue);
        }

        let statusRegister = new StatusRegister()

        this.setState({ registers: initializedRegisters, statusRegister: statusRegister })
    }

    selectExampleChange = (event: React.ChangeEvent<{ value: unknown }>) => {
        let x = event.target.value as number;
        this.setState({ userInput: examples[x][1], tabExample: x })
    };

    selectSpeedChange = (event: React.ChangeEvent<{ value: unknown }>) => {
        let speed = event.target.value as DebuggerSpeed;
        this.state.codeExecutionEngine.debuggerSpeed = speed;
        this.setState({ codeExecutionEngine: this.state.codeExecutionEngine });
    };

    render() {
        const style = { style: { padding: 0, 'padding-left': 10, width: '90px' } } as InputBaseComponentProps;

        return (
            <div className="App">
                <div className="App-header">
                    Examples:
                    <Select className="example-select"
                        labelId="demo-simple-select-label"
                        id="demo-simple-select"
                        value={this.state.tabExample}
                        onChange={this.selectExampleChange}
                    >
                        <MenuItem value={0}>{examples[0][0]}</MenuItem>
                        <MenuItem value={1}>{examples[1][0]}</MenuItem>
                    </Select>
                </div>
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
                            <div className="App-debugger-content">
                                <div>N: {this.state.statusRegister.getN()}, Z: {this.state.statusRegister.getZ()}, C: {this.state.statusRegister.getC()}, V: {this.state.statusRegister.getV()}</div>

                                <div><Button onClick={() => { this.state.userInputParser.parseUserInput() }} variant="outlined" color="primary">Compile</Button></div>
                                <div>
                                    <Button className="button" onClick={() => { this.state.codeExecutionEngine.stop = true; this.state.codeExecutionEngine.continue() }} variant="outlined" color="primary">NextInst</Button>
                                    <Button className="button" onClick={() => { this.state.codeExecutionEngine.stop = false; this.state.codeExecutionEngine.continue() }} variant="outlined" color="primary">Continue</Button>
                                    <Button onClick={() => this.state.codeExecutionEngine.stop = true} variant="outlined" color="primary">Stop</Button>
                                </div>
                                <div>
                                    <Button onClick={() => this.resetRegister()} variant="outlined" color="primary">Reset Register</Button>
                                </div>
                            </div>
                        </Box>
                        <Box height="19.75%" className="App-options">
                            Debugger Speed:
                            <Select className="example-select"
                                labelId="demo-simple-select-label"
                                id="demo-simple-select"
                                value={this.state.codeExecutionEngine.debuggerSpeed}
                                onChange={this.selectSpeedChange}
                            >
                                <MenuItem value={DebuggerSpeed.Instant}>Instant</MenuItem>
                                <MenuItem value={DebuggerSpeed.Fast}>Fast</MenuItem>
                                <MenuItem value={DebuggerSpeed.Medium}>Medium</MenuItem>
                                <MenuItem value={DebuggerSpeed.Slow}>Slow</MenuItem>
                            </Select>
                        </Box>
                    </Box>
                    <Box width="79.75%" height="100%">
                        <Box height="79.5%" mb="0.5%">
                            <Tabs height="100%" selectedIndex={this.state.tab} onSelect={index => this.setState({ tab: index })}>
                                <TabList className="tab-list-input">
                                    <Tab>Code</Tab>
                                    <Tab>Memory</Tab>
                                    <Tab>Playground</Tab>
                                </TabList>

                                <TabPanel style={{ height: 'calc(100% - 50px)' }}>
                                    <textarea className="App-userinput" value={this.state.userInput.toString()} onChange={e => this.userInputChange(e)} onKeyDown={e => this.allowTabKey(e)} />
                                </TabPanel>
                                <TabPanel style={{ height: 'calc(100% - 50px)' }}>
                                    {this.state.mainMemory.render()}
                                </TabPanel>
                                <TabPanel style={{ height: 'calc(100% - 50px)' }}>
                                    {this.state.playground.render()}
                                </TabPanel>
                            </Tabs>
                        </Box>
                        <Box height="19.5%">
                            {this.state.terminal.render()}
                        </Box>
                    </Box>
                </div>
            </div>
        )
    }
}



class Terminal {
    messages: [MessageType, string][];
    scrollRef: React.RefObject<any>;

    constructor(welcomeMessage: string) {
        this.messages = [[MessageType.Text, welcomeMessage,]];
        this.scrollRef = React.createRef();
    }

    addMessage(type: MessageType, message: string) {
        this.messages.push([type, message])
    }

    render() {
        return (<div className="App-terminal" ref={this.scrollRef}>
            {this.messages.map((message, i) => {
                let messageDiv;
                switch (message[0]) {
                    case MessageType.Text: messageDiv = <div className="App-terminal-content App-terminal-text"> {message[1]} </div>; break;
                    case MessageType.Warning: messageDiv = <div className="App-terminal-content App-terminal-warning"> {message[1]} </div>; break;
                    case MessageType.Error: messageDiv = <div className="App-terminal-content App-terminal-error"> {message[1]} </div>; break;
                }
                return messageDiv;
            })
            }
        </div>)
    }
}