export { examples }

const div32OutPut = 
`_start:

        LDR r0, =1024 //Dividend
        LDR r1, =245  // Divisor
	    MOV r2, #0
        BL div32      // Division 32 Bit

        MOV r4, r0
        BL hex        // Ausgabe Quotient

        MOV r0, #0
        MOV r7, #1    // wähle Systemaufruf exit
        SWI #0

div32:		// Dividend in r0 (32 Bit, vorzeichenlos)
			// Divisor in r1 (32 Bit, vorzeichenlos)
			// Hilfsregister r2 (für Subtraktion und dann Rest)
        MOV r3, #32	//Schleife

div32loop:
	MOVS r0, r0, LSL #1	// Schiebe höchstes Bit in Carry-Flag und setze niedrigstes Bit 0
	MOV r2, r2, LSL #1	// Hilfsregister r2, Verschiebe Hilfsregister um 1 Bit
	ADC r2, r2, #0		// Addiere den Carry-Bit auf niedrigstes Bit des Hilfsregisters
				        // Diese 3 Befehle schließen Verschiebeoperation ab
	RSBS r2, r1, r2		// Subtrahiere Divisor von Hilfsregister
	ORRPL r0, r0, #1	// positiv - Setze niedrigstes Bit von r0 auf 1
	ADDMI r2, r2, r1	// negativ - Wiederherstellung des Rests
	SUBS r3, r3, #1		
	BNE div32loop
	MOV pc, lr

hex:
        MOV r3, #8 // 8 Hexadezimalstellen
        MOV r7, #4 // wähle Systemaufruf write
        MOV r0, #1 // wähle stdout
        MOV r2, #1 // Länge der Zeichenkette

hexloop:
        LDR r1,=lut // Adresse der Zeichentabelle
        ADD r1, r1, r4, LSR #28 // addiere Bits 28–31 von r4
        SWI #0
        MOV r4, r4, LSL #4 // nächste Hex-Ziffer in Bits 28–31
        SUBS r3, r3, #1
        BNE hexloop

        LDR r1, =lb
        SWI #0

        MOV pc, lr // Rücksprung

lut: .ascii "0123456789abcdef"  // Look-Up-Tabelle
lb:  .ascii  "\\n"               // Zeilenumbruch`

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

const examples = [["Division + Output", div32OutPut], ["Test", test]]