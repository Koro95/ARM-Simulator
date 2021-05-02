export { Cpu }

class Cpu {
    registers: Register[];

    constructor() {
        let defaultValue = 0x0f000000;

        this.registers = [];

        for (let index = 0; index < 16; index++) {
            this.registers.push(new Register(defaultValue));
        }
    }

    ADD(a: Register, b: Register) {
        this.registers[3].value = a.value + b.value;
        console.log(this.registers[3])
    }
}

class Register {
    value: number;

    constructor(value: number){
        this.value = value;
    }

    toHex() {
        return ('00000000' + this.value.toString(16)).slice(-8)
    }
}