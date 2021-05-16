import React from "react";
import InputBase from '@material-ui/core/InputBase';
import Box from '@material-ui/core/Box';
import Button from '@material-ui/core/Button';

export { Cpu }

type CpuState = {
    registers: Register[];
    statusRegister: statusRegister;
}

class Cpu extends React.Component<any, CpuState> {
    constructor(props: any) {
        super(props)
        let defaultValue = 0x00000001;
        let initializedRegisters = []
        for (let index = 0; index < 16; index++) {
            initializedRegisters.push(new Register(defaultValue));
        }
        this.state = { registers: initializedRegisters, statusRegister: new statusRegister() };
    }

    ADD(y: number, a: number, b: number) {
        let newRegisters = [...this.state.registers];

        let temp = newRegisters[a].getValue() + newRegisters[b].getValue();
        newRegisters[y].setValue(this.setTo32Bit(temp));
        this.setState({ registers: newRegisters });

        console.log(newRegisters[0].getValue())
    }

    ADC(y: number, a: number, b: number) {
        let newRegisters = [...this.state.registers];

        let temp = newRegisters[a].getValue() + newRegisters[b].getValue() + this.state.statusRegister.getC();
        newRegisters[y].setValue(this.setTo32Bit(temp));
        this.setState({ registers: newRegisters });

        console.log(newRegisters[0].getValue())
    }

    SUB(y: number, a: number, b: number) {
        let newRegisters = [...this.state.registers];

        let temp = newRegisters[a].getValue() - newRegisters[b].getValue();
        newRegisters[y].setValue(this.setTo32Bit(temp));
        this.setState({ registers: newRegisters });

        console.log(newRegisters[0].getValue())
    }

    SBC(y: number, a: number, b: number) {
        let newRegisters = [...this.state.registers];

        let temp = newRegisters[a].getValue() - newRegisters[b].getValue() + this.state.statusRegister.getC() - 1;
        newRegisters[y].setValue(this.setTo32Bit(temp));
        this.setState({ registers: newRegisters });

        console.log(newRegisters[0].getValue())
    }

    RSB(y: number, a: number, b: number) {
        let newRegisters = [...this.state.registers];

        let temp = newRegisters[b].getValue() - newRegisters[a].getValue();
        newRegisters[y].setValue(this.setTo32Bit(temp));
        this.setState({ registers: newRegisters });

        console.log(newRegisters[0].getValue())
    }

    RSC(y: number, a: number, b: number) {
        let newRegisters = [...this.state.registers];

        let temp = newRegisters[b].getValue() - newRegisters[a].getValue() + this.state.statusRegister.getC() - 1;
        newRegisters[y].setValue(this.setTo32Bit(temp));
        this.setState({ registers: newRegisters });

        console.log(newRegisters[0].getValue())
    }

    MUL(y: number, a: number, b: number) {
        let newRegisters = [...this.state.registers];

        let temp = newRegisters[a].getValue() * newRegisters[b].getValue();
        newRegisters[y].setValue(this.setTo32Bit(temp));
        this.setState({ registers: newRegisters });

        console.log(newRegisters[0].getValue())
    }

    MLA(y: number, a: number, b: number, x: number) {
        let newRegisters = [...this.state.registers];

        let temp = (newRegisters[a].getValue() * newRegisters[b].getValue()) + newRegisters[x].getValue();
        newRegisters[y].setValue(this.setTo32Bit(temp));
        this.setState({ registers: newRegisters });

        console.log(newRegisters[0].getValue())
    }

    regValueChange = (index: number, e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
        let newValue = e.currentTarget.value;
        let newRegisters = [...this.state.registers];

        newRegisters[index].setValue(parseInt('0x' + newValue));
        this.setState({ registers: newRegisters });
    }

    setTo32Bit(x: number): number {
        x = x << 32;
        x = x >>> 32;
        return x;
    }

    render() {
        return (
            <Box height="100%">
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
                    <Button onClick={() => this.ADD(0, 1, 2)} variant="outlined" color="primary">ADD</Button>
                    <Button onClick={() => this.ADC(0, 1, 2)} variant="outlined" color="primary">ADC</Button>
                    <Button onClick={() => this.SUB(0, 1, 2)} variant="outlined" color="primary">SUB</Button>
                    <Button onClick={() => this.SBC(0, 1, 2)} variant="outlined" color="primary">SBC</Button>
                    <Button onClick={() => this.RSB(0, 1, 2)} variant="outlined" color="primary">RSB</Button>
                    <Button onClick={() => this.RSC(0, 1, 2)} variant="outlined" color="primary">RSC</Button>
                    <Button onClick={() => this.MUL(0, 1, 2)} variant="outlined" color="primary">MUL</Button>
                    <Button onClick={() => this.MLA(0, 1, 2, 3)} variant="outlined" color="primary">MLA</Button>
                </Box>
                <Box height="19.75%" className="App-options">
                    Options
                </Box>
            </Box>
        )
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

class statusRegister {
    flags: number[];

    constructor() {
        this.flags = [0, 0, 0, 0]
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