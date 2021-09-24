import { examples } from '../parser/examples/examples'
import React from "react";
import InputBase from '@material-ui/core/InputBase';
import { InputBaseComponentProps, MenuItem, Paper, Select, Table, TableBody, TableCell, TableContainer, TableRow } from "@material-ui/core";
import Box from '@material-ui/core/Box';
import Button from '@material-ui/core/Button';
import { Tab, Tabs, TabList, TabPanel } from 'react-tabs';
import 'react-tabs/style/react-tabs.css';
import CancelIcon from '@mui/icons-material/Cancel';
import DownloadIcon from '@mui/icons-material/Download';


import CodeMirror from '@uiw/react-codemirror';

import { CodeExecutionEngine } from "./CodeExecutionEngine";
import { StatusRegister } from "./StatusRegister";
import { MainMemory } from "./MainMemory";
import { UserInputParser } from './UserInputParser';
import { Playground } from './Playground';

export { Cpu, MessageType };

// Different message type for terminal ouput
enum MessageType {
    Output,
    Text,
    Warning,
    Error
}

// Speed of the debugger when used with continue
enum DebuggerSpeed {
    Instant,
    Slow = 300,
    Medium = 100,
    Fast = 10
}

// State of the Cpu react component
type CpuState = {
    registers: number[];
    statusRegister: StatusRegister;
    codeExecutionEngine: CodeExecutionEngine;
    userInputTemplate: string;
    userInput: string;
    terminal: Terminal;
    mainMemory: MainMemory;
    userInputParser: UserInputParser;
    playground: Playground;
    tab: number;
    tabExample: number;
    anchorEl: HTMLElement | null;
}

/*
    Class that implements the Cpu of the ARM simulator. Ties together all the
    individual parts and the main output for the user interface.

    registers: number[]
        Array with the 16 registers of user mode
    statusRegister: StatusRegister
        Status register of the cpu
    codeExecutionEngine: CodeExecutionEngine
        Class that executes the code on the cpu
    userInputTemplate: string
        The template loaded when user loads an example
    userInput: string
        Current userinput in the CodeMirror field
    terminal: Terminal
        Terminal used for messages and output
    mainMemory: MainMemory
        Main memory to store and get data from
    userInputParser: UserInputParser
        Parser to parse the input and add instructions/data
    playground: Playground
        Playground that is displayed in the memory tab
    tab: number
        Current main tab
    tabExample: number
        Current tab for the examples
    anchorEl: HTMLElement | null
        Anchor for the playground element
*/
class Cpu extends React.Component<any, CpuState> {
    constructor(props: any) {
        super(props)
        let defaultValue = 0x00000000;
        let welcomeMessage = "<" + new Date().toLocaleTimeString() + "> Welcome";
        let startingExample = 0;
        let example = examples[startingExample][1];

        let initializedRegisters = []
        for (let index = 0; index < 16; index++) {
            initializedRegisters.push(defaultValue);
        }

        this.state = {
            registers: initializedRegisters, statusRegister: new StatusRegister(),
            codeExecutionEngine: new CodeExecutionEngine(this), userInputTemplate: example, userInput: example, terminal: new Terminal(welcomeMessage),
            mainMemory: new MainMemory(this), userInputParser: new UserInputParser(this), playground: new Playground(this), tab: 0,
            tabExample: startingExample, anchorEl: null
        };
    }

    /*
        Function to add a new message to the terminal with message type

        message: string
            Message to add to the terminal
        type:  MessageType
            Type of message to be added. Default = MessageType.Text
    */
    newTerminalMessage(message: string, type: MessageType = MessageType.Text) {
        // add time string and message
        let newMessage = "\n<" + new Date().toLocaleTimeString() + "> " + message;

        // add to terminal and update it
        this.state.terminal.addMessage(type, newMessage);
        this.setState({ terminal: this.state.terminal })
    }

    /*
        Function to add output from the code execution engine to the terminal

        message: string
            Message to add to the terminal
    */
    newTerminalOutput(message: string) {
        let newTerminal = this.state.terminal;

        // get last message
        let lastMessageIndex = newTerminal.messages.length - 1;
        // if it was of type output, simply append to it
        if (newTerminal.messages[lastMessageIndex][0] === MessageType.Output) {
            let newMessage = newTerminal.messages[lastMessageIndex][1] + message;
            newTerminal.messages[lastMessageIndex][1] = newMessage;
            this.setState({ terminal: newTerminal })
        }
        // else start a new output
        else {
            this.state.terminal.addMessage(MessageType.Output, message);
        }

        // update terminal
        this.setState({ terminal: this.state.terminal })
    }

    /*
        Function to convert number to hex string with 8 characters

        x: number
            Number to convert

        return: string
            Hex string of the number
    */
    toHex(x: number): string {
        return ('00000000' + x.toString(16)).slice(-8);
    }

    /*
        Function to let user save code as file

        Code from:
            https://stackoverflow.com/questions/44656610/download-a-string-as-txt-file-in-react/44661948
    */
    downloadTxtFile = () => {
        const element = document.createElement("a");
        const file = new Blob([this.state.userInput], { type: 'text/plain' });
        element.href = URL.createObjectURL(file);
        element.download = "code.asm";
        document.body.appendChild(element); // Required for this to work in FireFox
        element.click();
    }

    /*
        Function to handle change in the user input

        newValue: string
            Value to be updated
    */
    userInputChange = (newValue: string) => {
        this.setState({ userInput: newValue });
    }

    /*
        Function to handle change in the registers

        index: number
            Index of the register to be updated
        e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>
            ChangeEvent for the update
    */
    regValueChange = (index: number, e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
        let newRegisters = [...this.state.registers];

        // parse hex value input
        let newValue = Number('0x' + e.currentTarget.value);
        // if valid value, update it
        if (!isNaN(newValue)) {
            newRegisters[index] = newValue;
        }

        // save selection start
        let start = e.target.selectionStart;

        // update register and set to selection start before update
        this.setState({ registers: newRegisters }, () => {
            if (start !== null) {
                e.target.selectionStart = e.target.selectionEnd = start - 1;
            }
        });
    }

    /*
        Function that handles changes between code and memory tabs

        index: number
            Index of the tab
    */
    tabChange = (index: number) => {
        this.setState({ tab: index }, () => {
            if (index === 1) {
                this.state.mainMemory.setGoto(0);
                this.state.mainMemory.gotoMemoryAddress();
            }
        })
    }

    /*
        Function to scroll to bottom of terminal, if it is updated
    */
    componentDidUpdate() {
        let scroll = this.state.terminal.scrollRef.current;
        scroll.scrollTop = scroll.scrollHeight - scroll.clientHeight;
    }

    /*
        Function to reset all register to 0x00000000
    */
    resetRegister() {
        let defaultValue = 0x00000000;
        let initializedRegisters = []
        for (let index = 0; index < 16; index++) {
            initializedRegisters.push(defaultValue);
        }

        let statusRegister = new StatusRegister()

        this.state.mainMemory.setGoto(0x00000000);
        this.state.mainMemory.gotoMemoryAddress();

        this.state.codeExecutionEngine.resetStackTrace();

        this.setState({ registers: initializedRegisters, statusRegister: statusRegister })
    }

    /*
        Function to handle a change in the example

        event: React.ChangeEvent<{ value: unknown }>:
            ChangeEvent from updating
    */
    selectExampleChange = (event: React.ChangeEvent<{ value: unknown }>) => {
        let x = event.target.value as number;

        // update tabExample and call loadExample
        this.setState({ tabExample: x }, () => this.loadExample())
    };


    /*
        Function that load example from current tabExample value
    */
    loadExample = () => {
        // load correct example and update it
        let example = examples[this.state.tabExample][1];
        this.setState({ userInputTemplate: "", userInput: "" },
            () => this.setState({ userInputTemplate: example, userInput: example, tab: 0 }))

    }

    /*
        Function that handles debugger speed changes

        event: React.ChangeEvent<{ value: unknown }>
            ChangeEvent from updating the speed
    */
    selectSpeedChange = (event: React.ChangeEvent<{ value: unknown }>) => {
        let speed = event.target.value as DebuggerSpeed;
        let newEngine = this.state.codeExecutionEngine;
        newEngine.debuggerSpeed = speed;
        this.setState({ codeExecutionEngine: newEngine });
    };

    /*
        Rendering of the Cpu class.

        Renders all main elements of the user interace:
            - Header with save code and load example
            - Register, Stacktrace and Breakpoints Tab
            - Debugger buttons
            - Options
            - Code and Memory Tabs
            - Terminal
    */
    render() {
        const style = { style: { padding: 0, 'padding-left': 10, width: '90px', fontFamily: 'monospace', height: '18px' } } as InputBaseComponentProps;
        const stackTrace = this.state.codeExecutionEngine.stackTrace;

        return (
            <div className="App">
                <div className="App-header">
                    <DownloadIcon onClick={this.downloadTxtFile} style={{ paddingTop: '3px', paddingLeft: '5px', paddingRight: '5px', cursor: 'pointer' }}></DownloadIcon>
                    Download Code

                    <div style={{ paddingLeft: '10px', paddingRight: '5px' }}>
                        <Select className="example-select"
                            labelId="demo-simple-select-label"
                            id="demo-simple-select"
                            value={this.state.tabExample}
                            onChange={this.selectExampleChange}
                            onClose={this.loadExample}
                        >
                            <MenuItem value={0}>{examples[0][0]}</MenuItem>
                            <MenuItem value={1}>{examples[1][0]}</MenuItem>
                            <MenuItem value={2}>{examples[2][0]}</MenuItem>
                            <MenuItem value={3}>{examples[3][0]}</MenuItem>
                            <MenuItem value={4}>{examples[4][0]}</MenuItem>
                            <MenuItem value={5}>{examples[5][0]}</MenuItem>
                            <MenuItem value={6}>{examples[6][0]}</MenuItem>
                        </Select>
                    </div>
                    Load Example

                </div>
                <div className="App-body">
                    <Box width="19.75%" mr="0.5%" height="100%" minWidth="150px">
                        <Box height="54%" mb="0.5%" className="App-cpustate">
                            <Tabs>
                                <TabList className="tab-list-reg">
                                    <Tab>Register</Tab>
                                    <Tab>Stacktrace</Tab>
                                    <Tab>Breakpoints</Tab>
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
                                    <div>N: {this.state.statusRegister.getN()}, Z: {this.state.statusRegister.getZ()}, C: {this.state.statusRegister.getC()}, V: {this.state.statusRegister.getV()}</div>
                                </TabPanel>
                                <TabPanel>

                                    <Table size="small" aria-label="a dense table">
                                        <TableBody>
                                            {stackTrace.map((row) => (
                                                <TableRow>
                                                    <TableCell align="center">
                                                        {this.toHex(row)}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>

                                </TabPanel>
                                <TabPanel>
                                    <TableContainer component={Paper} >
                                        <Table size="small" aria-label="a dense table">
                                            <TableBody>
                                                {Array.from(this.state.codeExecutionEngine.breakpoints).sort((a, b) => a - b).map((row) => (
                                                    <TableRow key={row} >
                                                        <TableCell align="center" style={{ fontFamily: 'monospace', display: 'flex', justifyContent: 'center' }} >
                                                            {this.toHex(row)}
                                                            <div onClick={() => { this.state.codeExecutionEngine.breakpoints.delete(row); this.setState({ codeExecutionEngine: this.state.codeExecutionEngine }) }}>
                                                                <CancelIcon style={{ height: '20px', verticalAlign: 'middle', cursor: 'pointer', paddingLeft: '5px' }}>
                                                                </CancelIcon></div>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </TableContainer>
                                </TabPanel>
                            </Tabs>
                        </Box>
                        <Box height="25.25%" mb="0.5%" className="App-debugger">
                            <div className="App-debugger-content">
                                <div style={{ paddingTop: '5px' }}>
                                    <Button onClick={() => { this.state.userInputParser.parseUserInput() }} variant="outlined" color="primary">Compile Code</Button>
                                </div>
                                <div style={{ paddingTop: '15px' }}>
                                    <Button className="button" onClick={() => { let newEngine = this.state.codeExecutionEngine; newEngine.stop = true; this.setState({ codeExecutionEngine: newEngine }, () => this.state.codeExecutionEngine.continue()) }} variant="outlined" color="primary">Next Instruction</Button>
                                    <Button className="button" onClick={() => { let newEngine = this.state.codeExecutionEngine; newEngine.stop = false; this.setState({ codeExecutionEngine: newEngine }, () => this.state.codeExecutionEngine.continue()) }} variant="outlined" color="primary">Continue</Button>
                                </div>
                                <div style={{ paddingTop: '5px' }}>
                                    <Button className="button" onClick={() => { let newEngine = this.state.codeExecutionEngine; newEngine.stop = false; newEngine.stopSubroutine = true; this.setState({ codeExecutionEngine: newEngine }, () => this.state.codeExecutionEngine.continue()) }} variant="outlined" color="primary">Finish Subroutine</Button>
                                    <Button onClick={() => { let newEngine = this.state.codeExecutionEngine; newEngine.stop = true; this.setState({ codeExecutionEngine: newEngine }) }} variant="outlined" color="primary">Stop</Button>
                                </div>
                                <div style={{ paddingTop: '15px' }}>
                                    <Button onClick={() => this.resetRegister()} variant="outlined" color="primary">Reset Registers</Button>
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
                            <Tabs height="100%" selectedIndex={this.state.tab} onSelect={this.tabChange}>
                                <TabList className="tab-list-input">
                                    <Tab>Code</Tab>
                                    <Tab>Memory</Tab>
                                </TabList>

                                <TabPanel style={{ height: 'calc(100% - 50px)' }} forceRender={true}>
                                    <CodeMirror
                                        className="App-userinput"
                                        value={this.state.userInputTemplate}
                                        onChange={this.userInputChange}
                                        height='100%' minHeight='100%' maxHeight='100%'
                                        width='100%' minWidth='100%' maxWidth='100%'
                                    />
                                </TabPanel>
                                <TabPanel style={{ height: 'calc(100% - 50px)' }}>
                                    {this.state.mainMemory.render()}
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


/*
    Class for the terminal to output messages

    messages: [MessageType, string][];
        Array of MessageType with corresponding message
    scrollRef: React.RefObject<any>;
        Reference to the scrollable element of the terminal
 */
class Terminal {
    messages: [MessageType, string][];
    scrollRef: React.RefObject<any>;

    constructor(welcomeMessage: string) {
        this.messages = [[MessageType.Text, welcomeMessage,]];
        this.scrollRef = React.createRef();
    }

    /*
        Function to add message to the terminal

        type: MessageType
            Type of the message
        message: string
            Message to add
    */
    addMessage(type: MessageType, message: string) {
        this.messages.push([type, message])
    }

    /*
        Render of the terminal class.
    */
    render() {
        return (<div className="App-terminal" ref={this.scrollRef}>
            {this.messages.map((message, i) => {
                let messageDiv;
                switch (message[0]) {
                    case MessageType.Output: messageDiv = <div className="App-terminal-content App-terminal-output"> {message[1]} </div>; break;
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