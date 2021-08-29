import Box from '@material-ui/core/Box';
import { isThisTypeNode } from 'typescript';
import { Cpu, MessageType } from "./Cpu";
import { Instruction, ArithmeticInstruction, LogicInstruction, CopyJumpInstruction, Operand, RegisterOperand, ImmediateOperand, ShiftOperand } from "./InstructionsAndOperands";

export { MainMemory };

class MainMemory {
    cpu: Cpu;
    memoryLines: Map<number, MemoryLine>;
    memoryString: string;

    constructor(cpu: Cpu) {
        this.cpu = cpu;
        this.memoryLines = new Map();
        this.memoryString = "";
    }

    addInstruction(instruction: string, condition: string, updateStatusRegister: boolean,
        op1: string | undefined, op2: string | undefined, op3: string | undefined, op4: string | undefined) {

        let stringOperands = [op1, op2, op3, op4]
        let operands: (Operand | undefined)[] = [];
        let invalidOperands: string[] = [];

        stringOperands.forEach(op => {
            let newOperand;
            if (typeof op !== 'undefined' && op !== "") {
                newOperand = this.addOperand(op);
                if (typeof newOperand === 'undefined') {
                    invalidOperands.push(op);
                }
            }
            operands.push(newOperand)
        });

        if (invalidOperands.length !== 0) {
            invalidOperands.forEach(op => {
                this.cpu.newTerminalMessage(MessageType.Error, op + " is an invalind operand!");
            });
            return;
        }

        let newInstruction;

        if (["ADD", "ADC", "SUB", "SBC", "RSB", "RSC", "MUL", "MLA"].includes(instruction)) {
            newInstruction = new ArithmeticInstruction(instruction, condition, operands[0], operands[1], operands[2], operands[3], updateStatusRegister);
        }
        else if (["AND", "ORR", "EOR", "BIC", "CMP", "CMN", "TST", "TEQ"].includes(instruction)) {
            newInstruction = new LogicInstruction(instruction, condition, operands[0], operands[1], operands[2], updateStatusRegister);
        }
        else if (["MOV", "MVN", "B", "BL"].includes(instruction)) {
            newInstruction = new CopyJumpInstruction(instruction, condition, operands[0], operands[1], updateStatusRegister);
        }

        if (typeof newInstruction !== 'undefined') {
            this.memoryLines.set((this.memoryLines.size * 4), new MemoryLine(newInstruction, undefined));
        }
        else {
            this.cpu.newTerminalMessage(MessageType.Error, instruction + " is an invalid instruction!");
            return;
        }
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
        if (opParts.length > 1) {
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
        switch (op) {
            case "sp": return new RegisterOperand(13);
            case "lr": return new RegisterOperand(14);
            case "pc": return new RegisterOperand(15);
        }

        let operandType = op.substr(0, 1);
        let operandValue = Number(op.substr(1));

        if (isNaN(operandValue)) {
            return undefined;
        }

        switch (operandType) {
            case "r":
                if (operandValue >= 0 && operandValue < 16) {
                    return new RegisterOperand(operandValue);
                }
                break;
            case "#":
                let mask = 0x00ffffff
                for (let i = 0; i < 16; i++) {
                    if (((mask & operandValue) === 0) || ((mask & ~operandValue) === 0)) {
                        return new ImmediateOperand(operandValue);
                    }
                    mask = ((mask >>> 2) | (mask << (32 - 2))) >>> 0;
                }
        }

        return undefined;
    }

    render() {
        let toHex = this.cpu.toHex;
        const items = [];
        for (let index = 0; index < 20; index++) {
            let string;
            string = toHex(index * 4);
            let content = this.memoryLines.get(index * 4);
            if (typeof content !== 'undefined') {
                string += content.getContent().toString()
            }
            else {
                string += "00000000"
            }
            items.push(string);
        }

        return (<Box className="App-userinput" >
            {
                items.map(element => {
                    return <div className="App-memory">{element} &nbsp;&nbsp;&nbsp;&nbsp; test</div>
                })

            }
        </Box>)
    }

    compile() {
        this.cpu.setState({ mainMemory: this })
    }

    toString() {
        let toHex = this.cpu.toHex;
        let newMemoryString = "";
        this.memoryLines.forEach((instruction, address) => {
            newMemoryString += toHex(address) + "\t" + instruction.toString() + "\n";
        });

        this.memoryString = newMemoryString;
        this.cpu.setState({ mainMemory: this })
    }
}

class MemoryLine {
    content: Instruction;
    label: string | undefined;

    constructor(content: Instruction, label: string | undefined) {
        this.content = content;
        this.label = label;
    }

    getContent() { return this.content };
    getLabel() { return this.label };
}