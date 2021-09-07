export { examples }

const test =
`.arm
.text
.global _start
_start:
	MVN r0, #15
	MOV r1, #0x00ff0000
	ADDS r1, r2, r3, LSL #4
subroutine:
	ADD r8, #1
	RSBNE r0, r1
	SUBEQS r11, r12, r10
	CMP r8, #2
	BLT subroutine
	MUL r4, r2, r3
	MLA r1, r2, r3,r7
	AND r1, r4, r6
test:
	CMP r8, #3
	BLLT _start
	ORR r3, r5
	CMP r0, r4
	TST r6, r7`

const div32 =
`// Ergebnis in r0, Rest in r2

start:
	MOV r0, #512   // Dividend
	MOV r1, #42    // Divisor
	MOV r2, #0     // Hilfsregister für Subtraktion und Rest
	BL div32       // Division 32 Bit

div32:
	MOV r3, #32    // Schleife
	
div32loop:
	MOVS r0, r0, LSL #1   // Schiebe höchstes Bit in Carry-Flag und setze niedrigstes Bit 0
	MOV r2, r2, LSL #1    // Hilfsregister r2, Verschiebe Hilfsregister um 1 Bit
	ADC r2, r2, #0        // Addiere den Carry-Bit auf niedrigstes Bit des Hilfsregisters
	                      // Diese 3 Befehle schließen Verschiebeoperation ab
	RSBS r2, r1, r2       // Subtrahiere Divisor von Hilfsregister
	ORRPL r0, r0, #1      // positiv - Setze niedrigstes Bit von r0 auf 1
	ADDMI r2, r2, r1      // negativ - Wiederherstellung des Rests
	SUBS r3, r3, #1       // Schleife zu Ende?
	BNE div32loop`

const examples = [["Test", test], ["Division 32-Bit", div32]]