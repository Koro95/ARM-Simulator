import { Cpu } from "./Cpu";
import { Instruction } from "./Instruction";

export { MainMemory };

class MainMemory {
    cpu: Cpu;
    instructions: Instruction[];
    memory: string;

    constructor(cpu: Cpu) {
            this.cpu = cpu;
            this.instructions = [];
            this.memory = "";
    }

    addInstruction(instruction: string, type: string, op1: string | undefined, op2: string | undefined, op3: string | undefined, op4: string | undefined,
        shift: string | undefined) {
        let newInstruction = new Instruction(instruction, type, op1, op2, op3, op4, shift);
        this.instructions.push(newInstruction);
    }

    compile() {
        let toHex = this.cpu.toHex;
        let newMemory = "";
        let address = 0;
        console.log(this.memory)
        this.instructions.forEach(function (currentInstruction) {
            newMemory +=  toHex(address) + currentInstruction.instruction.padStart(8, " ").padEnd(10, " ") +"r"+ currentInstruction.op1 +", r"+ currentInstruction.op2;
            if (typeof currentInstruction.op3 !== 'undefined') {
                newMemory += ", r"+ currentInstruction.op3
            }
            if (typeof currentInstruction.op4 !== 'undefined') {
                newMemory += ", r"+ currentInstruction.op4
            }
            newMemory += "\n";
            address += 4;
        });
        
        this.memory = newMemory;
        // temp memory string
        this.cpu.setState({ mainMemory: this })
    }
}