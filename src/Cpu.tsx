import React from "react";
import InputBase from '@material-ui/core/InputBase';

export { Cpu }

type CpuState = {
    registers: Register[];
}

class Cpu extends React.Component<any, CpuState> {
    constructor(props: any) {
        super(props)
        let defaultValue = 0x0f000000;
        let initializedRegisters = []
        for (let index = 0; index < 16; index++) {
            initializedRegisters.push(new Register(defaultValue));
        }
        this.state = { registers: initializedRegisters };
    }

    ADD() {
        /*         this.setState()
        console.log(this.registers[3])
        this.state.regi */
    }

    regValueChange = (index: number, e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
        let newValue = e.currentTarget.value;

        this.setState((state, props) => {
            let newRegisters = state.registers.map(item => item);
            newRegisters[index].value = parseInt('0x' + newValue);

            return { registers: newRegisters, props }
        });
    }

    render() {
        return (
            <div> <div> <div className="Reg-names">r0</div> <InputBase margin='none' defaultValue={this.state.registers[0].toHex()} onChange={e => this.regValueChange(0, e)} /> </div>
                <div> <div className="Reg-names">r1</div> <InputBase margin='none' defaultValue={this.state.registers[1].toHex()} onChange={e => this.regValueChange(1, e)} /> </div>
                <div> <div className="Reg-names">r2</div> <InputBase margin='none' defaultValue={this.state.registers[2].toHex()} onChange={e => this.regValueChange(2, e)} /> </div>
                <div> <div className="Reg-names">r3</div> <InputBase margin='none' defaultValue={this.state.registers[3].toHex()} onChange={e => this.regValueChange(3, e)} /> </div>
                <div> <div className="Reg-names">r4</div> <InputBase margin='none' defaultValue={this.state.registers[4].toHex()} onChange={e => this.regValueChange(4, e)} /> </div>
                <div> <div className="Reg-names">r5</div> <InputBase margin='none' defaultValue={this.state.registers[5].toHex()} onChange={e => this.regValueChange(5, e)} /> </div>
                <div> <div className="Reg-names">r6</div> <InputBase margin='none' defaultValue={this.state.registers[6].toHex()} onChange={e => this.regValueChange(6, e)} /> </div>
                <div> <div className="Reg-names">r7</div> <InputBase margin='none' defaultValue={this.state.registers[7].toHex()} onChange={e => this.regValueChange(7, e)} /> </div>
                <div> <div className="Reg-names">r8</div> <InputBase margin='none' defaultValue={this.state.registers[8].toHex()} onChange={e => this.regValueChange(8, e)} /> </div>
                <div> <div className="Reg-names">r9</div> <InputBase margin='none' defaultValue={this.state.registers[9].toHex()} onChange={e => this.regValueChange(9, e)} /> </div>
                <div> <div className="Reg-names">r10</div> <InputBase margin='none' defaultValue={this.state.registers[10].toHex()} onChange={e => this.regValueChange(10, e)} /> </div>
                <div> <div className="Reg-names">r11</div> <InputBase margin='none' defaultValue={this.state.registers[11].toHex()} onChange={e => this.regValueChange(11, e)} /> </div>
                <div> <div className="Reg-names">r12</div> <InputBase margin='none' defaultValue={this.state.registers[12].toHex()} onChange={e => this.regValueChange(12, e)} /> </div>
                <div> <div className="Reg-names">sp</div> <InputBase margin='none' defaultValue={this.state.registers[13].toHex()} onChange={e => this.regValueChange(13, e)} /> </div>
                <div> <div className="Reg-names">lr</div> <InputBase margin='none' defaultValue={this.state.registers[14].toHex()} onChange={e => this.regValueChange(14, e)} /> </div>
                <div> <div className="Reg-names">pc</div> <InputBase margin='none' defaultValue={this.state.registers[15].toHex()} onChange={e => this.regValueChange(15, e)} /> </div>
            </div>
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
}