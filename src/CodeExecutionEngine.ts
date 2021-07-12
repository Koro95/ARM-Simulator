import { Cpu } from "./Cpu";
import { Instruction } from "./Instruction";

export { CodeExecutionEngine };

class CodeExecutionEngine {
    cpu: Cpu;
    instructions: Instruction[];
    instructionIndex: number;

    constructor(cpu: Cpu) {
        this.cpu = cpu;
        this.instructions = [];
        this.instructionIndex = 0;
    }

    addInstruction(instruction: string, type: string, op1: number | undefined, op2: number | undefined, op3: number | undefined, op4: number | undefined,
        shift: string | undefined) {
        let newInstruction = new Instruction(this, instruction, type, op1, op2, op3, op4, shift);
        this.instructions.push(newInstruction);
    }

    executeNextInstruction() {
        let currentInstruction = this.instructions[this.instructionIndex];
        if (typeof currentInstruction !== 'undefined') {
            currentInstruction.executeInstruction();
            this.instructionIndex++;
        }
        else {
            let message = "\n<" + new Date().toLocaleTimeString() + "> Instructions finished!";
            let newTerminal = this.cpu.state.terminal + message;
            this.cpu.setState({ terminal: newTerminal })
        }
    }

    compile() {
        let toHex = this.cpu.toHex;
        let memory = "";
        let address = 0;

        this.instructions.forEach(function (currentInstruction) {
            memory +=  toHex(address) + currentInstruction.instruction.padStart(8, " ").padEnd(10, " ") +"r"+ currentInstruction.op1 +", r"+ currentInstruction.op2;
            if (typeof currentInstruction.op3 !== 'undefined') {
                memory += ", r"+ currentInstruction.op3
            }
            if (typeof currentInstruction.op4 !== 'undefined') {
                memory += ", r"+ currentInstruction.op4
            }
            memory += "\n";
            address += 4;
        });
        
        this.cpu.setState({ mainMemory: memory })
    }
}