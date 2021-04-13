export { Cpu }

class Cpu {
    registers: Register[];

    constructor() {
        let registerNames = ['r0', 'r1', 'r2', 'r3', 'r4', 'r5', 'r6',
            'r7', 'r8', 'r9', 'r10', 'r11', 'r12', 'sp', 'lr', 'pc']
        let defaultValue = 0x0f000000;

        this.registers = [];

        for (let index = 0; index < 16; index++) {
            this.registers.push(new Register(registerNames[index], defaultValue));
        }
    }
}

class Register {
    name: string;
    value: number;

    constructor(name: string, value: number){
        this.name = name;
        this.value = value;
    }

    toHex() {
        return ('00000000' + this.value.toString(16)).slice(-8)
    }
}