import { getTokenSourceMapRange } from "typescript";
import { Cpu } from "./Cpu";
import { Instruction, RegisterOperand, ImmediateOperand, ShiftOperand } from "./Instruction";

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
        
        let operands = [op1, op2, op3, op4];
        let operands1: RegisterOperand[] = [];
        let checkInvalidOperands = this.cpu.checkInvalidOperands;
        let checkInvalidShift = this.cpu.checkInvalidShift;
        let newTerminalMessage = this.cpu.newTerminalMessage;

        operands.forEach(function(op){
            if (typeof op !== 'undefined' ) {
                operands1.push(new RegisterOperand(parseInt(op.substr(1))))
                //newTerminalMessage(op + " is not a valid operand!")
            }

        });        

        let newInstruction = new Instruction(instruction, type, operands1[0], operands1[1], operands1[2], operands1[3], false);
        this.instructions.push(newInstruction);
    }

    compile() {
        let toHex = this.cpu.toHex;
        let newMemory = "";
        let address = 0;
        console.log(this.memory)
        this.instructions.forEach(function (currentInstruction) {
            newMemory +=  toHex(address) + currentInstruction.getInstruction().padStart(8, " ").padEnd(10, " ") +"r"+ currentInstruction.getOp1() +", r"+ currentInstruction.getOp2();
            if (typeof currentInstruction.getOp3() !== 'undefined') {
                newMemory += ", r"+ currentInstruction.getOp3()
            }
            if (typeof currentInstruction.getOp4() !== 'undefined') {
                newMemory += ", r"+ currentInstruction.getOp4()
            }
            newMemory += "\n";
            address += 4;
        });
        
        this.memory = newMemory;
        // temp memory string
        this.cpu.setState({ mainMemory: this })
    }
}