import { Cpu, MessageType } from "./Cpu";
import { Instruction, Operand, RegisterOperand, ImmediateOperand, ShiftOperand } from "./Instruction";

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
        
        let stringOperands = [op1, op2, op3, op4]
        let operands: (Operand | undefined)[] = [];

        stringOperands.forEach(op => {
            let newOperand;
            if (typeof op !== 'undefined' && op !== "") {
                newOperand = this.addOperand(op);
                if (typeof newOperand === 'undefined') {
                    this.cpu.newTerminalMessage(MessageType.Error, op + " is an invalind operand!");
                    return;
                }        
            }
            operands.push(newOperand)
        });        
 
        let newInstruction = new Instruction(instruction, type, operands[0], operands[1], operands[2], operands[3], false);
        this.instructions.push(newInstruction);
    }

    addOperand(op: string): Operand | undefined {
        // split in case of ShiftOperand
        let opParts = op.split(/,[ ]+/)

        // invalid or nested ShiftOperand not allowed
        let operand1 = this.checkValidOperand(opParts[0]);
        if (typeof operand1 === 'undefined' || operand1 instanceof ShiftOperand) {
            return undefined;
        }

        // case op = ShiftOperand
        if (opParts.length > 1 ) {
            let shiftParts = op.split(/[ ]+/);

            // invalid or nested ShiftOperand not allowed
            let operand2 = this.checkValidOperand(shiftParts[1])
            if (typeof operand2 === 'undefined' || operand2 instanceof ShiftOperand) {
                return undefined;
            }

            return new ShiftOperand(operand1, shiftParts[0], operand2);
        }
        // case op != ShiftOperand
        else {
            return operand1;
        }
    }

    checkValidOperand(op: string): Operand | undefined {
        switch(op) {
            case "sp": return new RegisterOperand(13);
            case "lr": return new RegisterOperand(14);
            case "pc": return new RegisterOperand(15);
        }

        let operandType = op.substr(0,1);
        let operandValue = parseInt(op.substr(1));

        switch(operandType) {
            case "r":
                if (operandValue >= 0  && operandValue < 16) {
                    return new RegisterOperand(operandValue);
                }
                break;
            case "#":
                //TODO: check correct immediate value
                if(operandValue < 23234) {
                    return new ImmediateOperand(operandValue);
                }
                break;
        }

        return undefined;
    }

    compile() {
        let toHex = this.cpu.toHex;
        let newMemory = "";
        let address = 0;
        console.log(this.memory)
        this.instructions.forEach(function (currentInstruction) {
            newMemory +=  toHex(address) + currentInstruction.getInstruction().padStart(8, " ").padEnd(10, " ") + currentInstruction.getOp1() + ", " + currentInstruction.getOp2();
            if (typeof currentInstruction.getOp3() !== 'undefined') {
                newMemory += ", "+ currentInstruction.getOp3()
            }
            if (typeof currentInstruction.getOp4() !== 'undefined') {
                newMemory += ", "+ currentInstruction.getOp4()
            }
            newMemory += "\n";
            address += 4;
        });
        
        this.memory = newMemory;
        // temp memory string
        this.cpu.setState({ mainMemory: this })
    }
}