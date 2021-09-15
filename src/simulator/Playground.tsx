import { Box, Button, Checkbox, InputBase, InputBaseComponentProps } from "@material-ui/core";
import { Cpu, MessageType } from "./Cpu";

export { Playground }

class Playground {
    cpu: Cpu;
    testOp: string[];
    cond: string;
    S: boolean;
    address: number;
    execute: boolean;

    constructor(cpu: Cpu) {
        this.cpu = cpu;
        this.testOp = ["r0", "r1", "r2", "r3"];
        this.cond = "";
        this.S = false;
        this.address = 0;
        this.execute = false;
    }

    checkConditionAndOperands(numOfOperands: number) {
        let check = true;

        for (let index = 0; index < numOfOperands; index++) {
            if (this.testOp[index] === "") {
                this.cpu.newTerminalMessage("More operands needed!", MessageType.Error)
                check = false;
                break;
            }
        }

        if (!["", "eq", "ne", "hs", "cs", "lo", "cc", "mi", "pl", "vs", "vc", "hi", "ls", "ge", "lt", "gt", "le", "al", "nv"].includes(this.cond)) {
            this.cpu.newTerminalMessage("Invalid Condition", MessageType.Error)
            check = false;
        }

        return check;
    }

    increaseAndExecute(successful: boolean) {
        if (successful) {
            this.cpu.setState({ mainMemory: this.cpu.state.mainMemory })
            if (this.execute) {
                let newRegisters = [...this.cpu.state.registers];
                newRegisters[15] = this.address;
                this.cpu.setState({ registers: newRegisters }, () => {
                    this.cpu.state.codeExecutionEngine.stop = true;
                    this.cpu.state.codeExecutionEngine.continue()
                })
            }
            this.address += 4;
        }
    }

    render() {
        const testOperandsStyle = { style: { padding: 0, 'padding-left': 5, width: '100px', border: 'black solid 1px', 'margin-bottom': 2 } } as InputBaseComponentProps;

        return (<Box className="App-playground">
            <div className="playground-header">
                <div style={{ fontSize: '20px' }}> Add Instructions to Memory </div>
                <div style={{ fontSize: '15px' }}> Uses maximum number of possible operands for instruction <br />
                    (e.g. op3 has to be empty for ADD r0, r1) </div>
            </div>

            <div className="playground-div">
                <div className="playground-operands">
                    <div className="playground-operands">Op1:</div>
                    <InputBase inputProps={testOperandsStyle} value={this.testOp[0]} onChange={e => { this.testOp[0] = e.currentTarget.value; this.cpu.setState({ playground: this }) }} />
                </div>
                <div className="playground-operands">
                    <div className="playground-operands">Op2:</div> <InputBase inputProps={testOperandsStyle} value={this.testOp[1]} onChange={e => { this.testOp[1] = e.currentTarget.value; this.cpu.setState({ playground: this }) }} />
                </div>
                <div className="playground-operands">
                    <div className="playground-operands">Op3:</div> <InputBase inputProps={testOperandsStyle} value={this.testOp[2]} onChange={e => { this.testOp[2] = e.currentTarget.value; this.cpu.setState({ playground: this }) }} />
                </div>
                <div className="playground-operands">
                    <div className="playground-operands">Op4:</div> <InputBase inputProps={testOperandsStyle} value={this.testOp[3]} onChange={e => { this.testOp[3] = e.currentTarget.value; this.cpu.setState({ playground: this }) }} />
                </div>
                <div className="playground-operands">
                    <div className="playground-operands">Cond:</div> <InputBase inputProps={testOperandsStyle} value={this.cond} onChange={e => { this.cond = e.currentTarget.value; this.cpu.setState({ playground: this }) }} />
                </div>
                <div className="playground-operands">
                    <div >S:</div><Checkbox style={{ padding: '0px', marginLeft: '5px' }} checked={this.S} onChange={e => { this.S = e.currentTarget.checked; this.cpu.setState({ playground: this }) }} color="primary" />
                </div>
                <div className="playground-operands">
                    <div className="playground-operands">Address(Hex):</div>
                    <InputBase inputProps={testOperandsStyle} value={this.address.toString(16)} onChange={e => {
                        let address = parseInt(e.currentTarget.value, 16)                 
                        if (!isNaN(address)) {
                            console.log(address)
                            this.address = address;
                        }
                        else {
                            this.address = 0;
                        }
                        this.cpu.setState({ playground: this })
                    }} />
                    <div className="playground-operands"></div>
                </div>
                <div className="playground-operands">
                    <div>Execute Instruction:</div><Checkbox style={{ padding: '0px', marginLeft: '5px' }} checked={this.execute} onChange={e => { this.execute = e.currentTarget.checked; this.cpu.setState({ playground: this }) }} color="primary" />
                </div>
            </div>

            <div className="playground-div">
                <div className="playground-sub-div">
                    <Button onClick={() => {
                        if (this.checkConditionAndOperands(2)) {
                            let successful = this.cpu.state.mainMemory.addInstruction("add", this.cond.toLowerCase(), this.S, this.testOp[0], this.testOp[1], this.testOp[2], undefined, this.address)
                            this.increaseAndExecute(successful);
                        }
                    }} variant="outlined" color="primary">ADD</Button>
                    <Button onClick={() => {
                        if (this.checkConditionAndOperands(2)) {
                            let successful = this.cpu.state.mainMemory.addInstruction("adc", this.cond.toLowerCase(), this.S, this.testOp[0], this.testOp[1], this.testOp[2], undefined, this.address)
                            this.increaseAndExecute(successful);
                        }
                    }} variant="outlined" color="primary">ADC</Button>
                    <Button onClick={() => {
                        if (this.checkConditionAndOperands(2)) {
                            let successful = this.cpu.state.mainMemory.addInstruction("sub", this.cond.toLowerCase(), this.S, this.testOp[0], this.testOp[1], this.testOp[2], undefined, this.address)
                            this.increaseAndExecute(successful);
                        }
                    }} variant="outlined" color="primary">SUB</Button>
                    <Button onClick={() => {
                        if (this.checkConditionAndOperands(2)) {
                            let successful = this.cpu.state.mainMemory.addInstruction("sbc", this.cond.toLowerCase(), this.S, this.testOp[0], this.testOp[1], this.testOp[2], undefined, this.address)
                            this.increaseAndExecute(successful);
                        }
                    }} variant="outlined" color="primary">SBC</Button>
                </div>
                <div>
                    <Button onClick={() => {
                        if (this.checkConditionAndOperands(2)) {
                            let successful = this.cpu.state.mainMemory.addInstruction("rsb", this.cond.toLowerCase(), this.S, this.testOp[0], this.testOp[1], this.testOp[2], undefined, this.address)
                            this.increaseAndExecute(successful);
                        }
                    }} variant="outlined" color="primary">RSB</Button>
                    <Button onClick={() => {
                        if (this.checkConditionAndOperands(2)) {
                            let successful = this.cpu.state.mainMemory.addInstruction("rsc", this.cond.toLowerCase(), this.S, this.testOp[0], this.testOp[1], this.testOp[2], undefined, this.address)
                            this.increaseAndExecute(successful);
                        }
                    }} variant="outlined" color="primary">RSC</Button>
                    <Button onClick={() => {
                        if (this.checkConditionAndOperands(2)) {
                            let successful = this.cpu.state.mainMemory.addInstruction("mul", this.cond.toLowerCase(), this.S, this.testOp[0], this.testOp[1], this.testOp[2], undefined, this.address)
                            this.increaseAndExecute(successful);
                        }
                    }} variant="outlined" color="primary">MUL</Button>
                    <Button onClick={() => {
                        if (this.checkConditionAndOperands(4)) {
                            let successful = this.cpu.state.mainMemory.addInstruction("mla", this.cond.toLowerCase(), this.S, this.testOp[0], this.testOp[1], this.testOp[2], this.testOp[3], this.address)
                            this.increaseAndExecute(successful);
                        }
                    }} variant="outlined" color="primary">MLA</Button>
                </div>
            </div>
            <div className="playground-div">
                <div className="playground-sub-div">
                    <Button onClick={() => {
                        if (this.checkConditionAndOperands(2)) {
                            let successful = this.cpu.state.mainMemory.addInstruction("and", this.cond.toLowerCase(), this.S, this.testOp[0], this.testOp[1], this.testOp[2], undefined, this.address)
                            this.increaseAndExecute(successful);
                        }
                    }} variant="outlined" color="primary">AND</Button>
                    <Button onClick={() => {
                        if (this.checkConditionAndOperands(2)) {
                            let successful = this.cpu.state.mainMemory.addInstruction("orr", this.cond.toLowerCase(), this.S, this.testOp[0], this.testOp[1], this.testOp[2], undefined, this.address)
                            this.increaseAndExecute(successful);
                        }
                    }} variant="outlined" color="primary">ORR</Button>
                    <Button onClick={() => {
                        if (this.checkConditionAndOperands(2)) {
                            let successful = this.cpu.state.mainMemory.addInstruction("eor", this.cond.toLowerCase(), this.S, this.testOp[0], this.testOp[1], this.testOp[2], undefined, this.address)
                            this.increaseAndExecute(successful);
                        }
                    }} variant="outlined" color="primary">EOR</Button>
                    <Button onClick={() => {
                        if (this.checkConditionAndOperands(2)) {
                            let successful = this.cpu.state.mainMemory.addInstruction("bic", this.cond.toLowerCase(), this.S, this.testOp[0], this.testOp[1], this.testOp[2], undefined, this.address)
                            this.increaseAndExecute(successful);
                        }
                    }} variant="outlined" color="primary">BIC</Button>
                </div>
                <div>
                    <Button onClick={() => {
                        if (this.checkConditionAndOperands(2)) {
                            let successful = this.cpu.state.mainMemory.addInstruction("cmp", this.cond.toLowerCase(), true, this.testOp[0], this.testOp[1], undefined, undefined, this.address)
                            this.increaseAndExecute(successful);
                        }
                    }} variant="outlined" color="primary">CMP</Button>
                    <Button onClick={() => {
                        if (this.checkConditionAndOperands(2)) {
                            let successful = this.cpu.state.mainMemory.addInstruction("cmn", this.cond.toLowerCase(), true, this.testOp[0], this.testOp[1], undefined, undefined, this.address)
                            this.increaseAndExecute(successful);
                        }
                    }} variant="outlined" color="primary">CMN</Button>
                    <Button onClick={() => {
                        if (this.checkConditionAndOperands(2)) {
                            let successful = this.cpu.state.mainMemory.addInstruction("tst", this.cond.toLowerCase(), true, this.testOp[0], this.testOp[1], undefined, undefined, this.address)
                            this.increaseAndExecute(successful);
                        }
                    }} variant="outlined" color="primary">TST</Button>
                    <Button onClick={() => {
                        if (this.checkConditionAndOperands(2)) {
                            let successful = this.cpu.state.mainMemory.addInstruction("teq", this.cond.toLowerCase(), true, this.testOp[0], this.testOp[1], undefined, undefined, this.address)
                            this.increaseAndExecute(successful);
                        }
                    }} variant="outlined" color="primary">TEQ</Button>
                </div>
            </div>
            <div className="playground-div">
                <div className="playground-sub-div">
                    <Button onClick={() => {
                        if (this.checkConditionAndOperands(2)) {
                            let successful = this.cpu.state.mainMemory.addInstruction("mov", this.cond.toLowerCase(), this.S, this.testOp[0], this.testOp[1], undefined, undefined, this.address)
                            this.increaseAndExecute(successful);
                        }
                    }} variant="outlined" color="primary">MOV</Button>
                    <Button onClick={() => {
                        if (this.checkConditionAndOperands(2)) {
                            let successful = this.cpu.state.mainMemory.addInstruction("mvn", this.cond.toLowerCase(), this.S, this.testOp[0], this.testOp[1], undefined, undefined, this.address)
                            this.increaseAndExecute(successful);
                        }
                    }} variant="outlined" color="primary">MVN</Button>
                    <Button onClick={() => {
                        if (this.checkConditionAndOperands(1)) {
                            let successful = this.cpu.state.mainMemory.addInstruction("b", this.cond.toLowerCase(), false, this.testOp[0], undefined, undefined, undefined, this.address)
                            this.increaseAndExecute(successful);
                        }
                    }} variant="outlined" color="primary">B</Button>
                    <Button onClick={() => {
                        if (this.checkConditionAndOperands(2)) {
                            let successful = this.cpu.state.mainMemory.addInstruction("bl", this.cond.toLowerCase(), false, this.testOp[0], undefined, undefined, undefined, this.address)
                            this.increaseAndExecute(successful);
                        }
                    }} variant="outlined" color="primary">BL</Button>
                </div>
                <Button onClick={() => {
                    this.cpu.state.mainMemory.addLabel(this.address, this.testOp[0]);
                    this.cpu.setState({ mainMemory: this.cpu.state.mainMemory })
                }} variant="outlined" color="primary">Add Label (Op1 at Address)</Button>
            </div>
            <div className="playground-div">
                <div className="playground-sub-div">
                    <Button onClick={() => {
                        if (this.checkConditionAndOperands(2)) {
                            let successful = this.cpu.state.mainMemory.addInstruction("ldr", this.cond.toLowerCase(), false, this.testOp[0], this.testOp[1], undefined, undefined, this.address)
                            this.increaseAndExecute(successful);
                        }
                    }} variant="outlined" color="primary">LDR</Button>
                    <Button onClick={() => {
                        if (this.checkConditionAndOperands(2)) {
                            let successful = this.cpu.state.mainMemory.addInstruction("str", this.cond.toLowerCase(), false, this.testOp[0], this.testOp[1], undefined, undefined, this.address)
                            this.increaseAndExecute(successful);
                        }
                    }} variant="outlined" color="primary">STR</Button>
                </div>
            </div>
            <div className="playground-div">
                <div className="playground-sub-div">
                    <Button onClick={() => {
                        this.cpu.state.mainMemory.resetMemory();
                    }} variant="outlined" color="primary">Reset Memory</Button>

                </div>
            </div>
        </Box>)
    }
}