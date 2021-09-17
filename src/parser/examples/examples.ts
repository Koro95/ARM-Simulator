export { examples }

const div32OutPut = 
`.arm	// Skelett für Aufgabe 8.1

.text
.global _start

_start:
	LDR r0, =1024   // Dividend
    LDR r1, =245    // Divisor
	MOV r2, #0      // Setze Hilfsregister auf 0
    BL div32        // Division 32 Bit

    MOV r4, r0
    BL hex          // Ausgabe Quotient

    MOV r4, r2	    // Rest in Hilfsregister r2
    BL hex          // Ausgabe Rest

    MOV r0, #0
    MOV r7, #1      // wähle Systemaufruf exit
    SWI #0

div32:	         // Dividend in r0 (32 Bit, vorzeichenlos)
		         // Divisor in r1 (32 Bit, vorzeichenlos)
		         // Hilfsregister r2 (für Subtraktion und dann Rest)
    MOV r3, #32	 //Schleife

div32loop:
	MOVS r0, r0, LSL #1	   // Schiebe höchstes Bit in Carry-Flag und setze niedrigstes Bit 0
	MOV r2, r2, LSL #1	   // Hilfsregister r2, Verschiebe Hilfsregister um 1 Bit
	ADC r2, r2, #0		   // Addiere den Carry-Bit auf niedrigstes Bit des Hilfsregisters
				           // Diese 3 Befehle schließen Verschiebeoperation ab
	RSBS r2, r1, r2		   // Subtrahiere Divisor von Hilfsregister
	ORRPL r0, r0, #1	   // positiv - Setze niedrigstes Bit von r0 auf 1
	ADDMI r2, r2, r1	   // negativ - Wiederherstellung des Rests
	SUBS r3, r3, #1		
	BNE div32loop
	MOV pc, lr

//.align
hex:
    STMFD sp!, {r0-r12,lr} // Register sichern
    MOV r3, #8             // 8 Hexadezimalstellen
    MOV r7, #4             // wähle Systemaufruf write
    MOV r0, #1             // wähle stdout
    MOV r2, #1             // Länge der Zeichenkette

hexloop:
    LDR r1,=lut              // Adresse der Zeichentabelle
    ADD r1, r1, r4, LSR #28  // addiere Bits 28–31 von r4
    SWI #0
    MOV r4, r4, LSL #4       // nächste Hex-Ziffer in Bits 28–31
    SUBS r3, r3, #1
    BNE hexloop

    LDR r1, =lb
    SWI #0

    LDMFD sp!, {r0-r12, lr}  // Register wiederherstellen
    MOV pc, lr               // Rücksprung

lut: .ascii "0123456789abcdef"  // Look-Up-Tabelle
lb:  .ascii  "\\n"               // Zeilenumbruch`

const hello =
`.data
msg:
.ascii	"Hello Innsbruck!\\n"

		len = . - msg
.align
.global	_start
_start:
/* write syscall */
	MOV r0, #1 
	LDR r1, =msg 
	LDR r2, =len 
	MOV r7, #4 
	SWI #0 
/* exit syscall */
	MOV r0, #0 
	MOV r7, #1 
	SWI #0`

const examples = [["Division + Output", div32OutPut], ["Hello World", hello]]