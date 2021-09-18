export { examples }

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

const compare =
`.data
msg1:
.ascii "richtig!\\n"
len1 = . - msg1

msg2:
.ascii "falsch!\\n"
len2 = . -msg2

.align
.global _start
_start:

	LDR r3, =15	// 1. Wert in Register r3
	LDR r4, =16	// 2. Wert in Register r4
	CMP r3, r4	// Vergleich ob r3 und r4 gleich sind
	BLEQ if		// falls ja, Sprung zu msg1
	BLNE else	// falls nein, Sprung zu msg2

/* exit syscall */
        MOV r0, #0 
        MOV r7, #1 
        SWI #0
if:
	MOV r8, lr	// Rücksprungadresse sichern
	LDR r1, =msg1 
	LDR r2, =len1 
	BL print
	MOV pc, r8	// Rücksprung
else:
	MOV r8, lr	// Rücksprungadresse sichern
	LDR r1, =msg2
	LDR r2, =len2 
	BL print
	MOV pc, r8	// Rücksprung

print:	/* write syscall */
	MOV r0, #1
	MOV r7, #4
	SWI #0
	MOV pc, lr	// Rücksprung`

const xmas = 
`.data
msg1:
.ascii	"HoHoHo\\n"
	len1 = . - msg1
msg2:
.ascii "Merry Xmas\\n"
	len2 = . - msg2
.align
.global	_start
_start:
	LDR r1, =msg1 
	LDR r2, =len1 
	LDR r3, =msg2
 	LDR r4, =len2
	LDR r5, =0
	BL loop
/* exit syscall */
	MOV r0, #0 
	MOV r7, #1 
	SWI #0

loop:
	CMP r5, #10
	ADD r5, r5, #1
	MOVEQ r1, r3
	MOVEQ r2, r4
/* write syscall */
	MOV r0, #1
	MOV r7, #4 
	SWI #0
	BNE loop
	MOV pc, lr`

const binOct = 
`.arm	// Skelett für Aufgabe 8.2

.text

.global _start

_start:

    LDR r1,=22948	// Wert für Ausgabe

  	MOV r4, r1

    BL bin		// Ausgabe binär
    BL okt  	// Ausgabe oktal
	BL hex 		// Ausgabe hexadezimal

    MOV r0, #0
    MOV r7, #1 	// wähle Systemaufruf exit
    SWI #0

bin:
	STMFD sp!, {r0-r12, lr} 	// alle Register sichern
	MOV r3, #32			// 32 Binärstellen
    MOV r0, #1
	MOV r7, #4			// wähle Systemaufruf write
	MOV r2, #1			// Länge der Zeichenkette
binloop:
	LDR r1, =lut			// Adresse der Zeichentabelle
	ADD r1, r1, r4, LSR #31		// addiere höchstes Bit von r4
	SWI #0
	MOV r4, r4, LSL #1		// nächste Binär-Ziffer in höchstem Bit
	SUBS r3, r3, #1
	BNE binloop

    LDR r1, =lb
    MOV r0, #1
    MOV r2, #1
    SWI #0

	LDMFD sp!, {r0-r12, lr} 	// alle Register wiederherstellen
    MOV pc, lr              	// Rücksprung

okt:
	STMFD sp!, {r0-r12, lr} 	// alle Register sichern
	MOV r3, #11			// 11 Oktalstellen
    MOV r0, #1
	MOV r7, #4			// wähle Systemaufruf write
	MOV r2, #1			// Länge der Zeichenkett
oktloop:
	LDR r1, =lut			// Adresse der Zeichentabelle
	ADD r1, r1, r4, LSR #29		// addiere Bits 29-31 von r4
	SWI #0
	CMP r3, #11			// compare, ob es der erste Durchlauf ist
					// Beim ersten Durchlauf wurden nur die höchsten
					// 2 Bits oktal ausgegeben. Danach immer 3 Bits.
	MOVEQ r4, r4, LSL #2		// 1. Durchlauf: Ersetze höchsten 2 Bits mit nächsten 3
	MOVNE r4, r4, LSL #3		// nächste Oktal-Ziffer in höchsten 3 Bits
	SUBS r3, r3, #1
	BNE oktloop

    LDR r1, =lb
    MOV r0, #1
    MOV r2, #1
    SWI #0
	
	LDMFD sp!, {r0-r12, lr} 	// alle Register wiederherstellen
    MOV pc, lr              	// Rücksprung

hex:
	STMFD sp!, {r0-r12, lr} 	// alle Register sichern
	MOV r3, #8
    MOV r0, #1
	MOV r7, #4
	MOV r2, #1
hexloop:
	LDR r1, =lut
	ADD r1, r1, r4, LSR #28
	SWI #0
	MOV r4, r4, LSL #4
	SUBS r3, r3, #1
	BNE hexloop

    LDR r1, =lb
    MOV r0, #1
    MOV r2, #1
    SWI #0
	
	LDMFD sp!, {r0-r12, lr} 	// alle Register wiederherstellen
    MOV pc, lr              	// Rücksprung
	
div:    // Dividend in r1 (16 Bit, vorzeichenlos)
        // Divisor in r2 (16 Bit, vorzeichenlos)

    MOV r2, r2, LSL #16
    MOV r3, #16           // Schleifenzähler
divloop:
    RSBS r1, r2, r1, LSL #1 // schiebe und subtrahiere
    ORRPL r1, r1, #1
    ADDMI r1, r1, r2        // Wiederherstellung des Rests
    SUBS r3, r3, #1
    BNE divloop
                // Quotient in r1_15, . . . , r1_0
                // Rest in r1_31, . . . , r1_16
    MOV pc, lr             // Rücksprung

lut:	.ascii "0123456789abcdef"
lb:     .ascii  "\\n"               // Zeilenumbruch`

const binOctFull =
`.arm	// Skelett für Aufgabe 8.2

.text

.global _start

_start:

        LDR r1,=22948	// Wert für Ausgabe

	MOV r4, r1

/* Die vorgegebene Ausgabe für Dezimalzahlen führt bei zu großen Zahlen zu
   einem Segmentation Fault. Wenn man diese Stelle wegkommentiert, können
   beliebig große Zahlen bis 2^32-1 dargestellt werden */

        BL dec  	// Ausgabe dezimal
        BL bin		// Ausgabe binär
        BL okt  	// Ausgabe oktal
		BL hex 		// Ausgabe hexadezimal

        MOV r0, #0
        MOV r7, #1 	// wähle Systemaufruf exit
        SWI #0

bin:
	STMFD sp!, {r0-r12, lr} 	// alle Register sichern
	MOV r3, #32			// 32 Binärstellen
	MOV r7, #4			// wähle Systemaufruf write
	MOV r2, #1			// Länge der Zeichenkette
binloop:
	LDR r1, =lut			// Adresse der Zeichentabelle
	ADD r1, r1, r4, LSR #31		// addiere höchstes Bit von r4
	SWI #0
	MOV r4, r4, LSL #1		// nächste Binär-Ziffer in höchstem Bit
	SUBS r3, r3, #1
	BNE binloop

        LDR r1, =lb
        MOV r0, #1
        MOV r2, #1
        SWI #0

	LDMFD sp!, {r0-r12, lr} 	// alle Register wiederherstellen
        MOV pc, lr              	// Rücksprung

okt:
	STMFD sp!, {r0-r12, lr} 	// alle Register sichern
	MOV r3, #11			// 11 Oktalstellen
	MOV r7, #4			// wähle Systemaufruf write
	MOV r2, #1			// Länge der Zeichenkett
oktloop:
	LDR r1, =lut			// Adresse der Zeichentabelle
	ADD r1, r1, r4, LSR #29		// addiere Bits 29-31 von r4
	SWI #0
	CMP r3, #11			// compare, ob es der erste Durchlauf ist
					// Beim ersten Durchlauf wurden nur die höchsten
					// 2 Bits oktal ausgegeben. Danach immer 3 Bits.
	MOVEQ r4, r4, LSL #2		// 1. Durchlauf: Ersetze höchsten 2 Bits mit nächsten 3
	MOVNE r4, r4, LSL #3		// nächste Oktal-Ziffer in höchsten 3 Bits
	SUBS r3, r3, #1
	BNE oktloop

        LDR r1, =lb
        MOV r0, #1
        MOV r2, #1
        SWI #0
	
	LDMFD sp!, {r0-r12, lr} 	// alle Register wiederherstellen
        MOV pc, lr              	// Rücksprung

hex:
	STMFD sp!, {r0-r12, lr} 	// alle Register sichern
	MOV r3, #8
	MOV r7, #4
	MOV r2, #1
hexloop:
	LDR r1, =lut
	ADD r1, r1, r4, LSR #28
	SWI #0
	MOV r4, r4, LSL #4
	SUBS r3, r3, #1
	BNE hexloop

        LDR r1, =lb
        MOV r0, #1
        MOV r2, #1
        SWI #0
	
	LDMFD sp!, {r0-r12, lr} 	// alle Register wiederherstellen
        MOV pc, lr              	// Rücksprung
	
div:    // Dividend in r1 (16 Bit, vorzeichenlos)
        // Divisor in r2 (16 Bit, vorzeichenlos)

        MOV r2, r2, LSL #16
        MOV r3, #16           // Schleifenzähler
divloop:
        RSBS r1, r2, r1, LSL #1 // schiebe und subtrahiere
        ORRPL r1, r1, #1
        ADDMI r1, r1, r2        // Wiederherstellung des Rests
        SUBS r3, r3, #1
        BNE divloop
                // Quotient in r1_15, . . . , r1_0
                // Rest in r1_31, . . . , r1_16
        MOV pc, lr             // Rücksprung

dec:                    // Ganzzahl in r1 (32 Bit, vorzeichenlos)
        STMFD sp!, {r0-r12, lr} // alle Register sichern
        LDR r5,=bufferdec+10    // Zeiger auf Ende des Puffers +1
        MOV r6, #0x30           // ASCII-Kode für 0 als Offset
        MOV r0, #1		// wähle stdout
        MOV r7, #0              // Stellenzähler
decloop:
        ADD r7, r7, #1          // nächste Ziffer (mind. eine)
        MOV r2, #10             // Basis 10 (dezimal)
        BL div                  // r1 : r2 von Folie 5
        ADD r4, r6, r1, LSR #16 // Rest als Ziffer in ASCII . . .
        STRB r4, [r5,-r7]       // . . . rückwärts in Puffer schreiben
        BICS r1, r1, #0x000f0000 // Rest löschen
        BNE decloop             // mehr Stellen wenn Quotient > 0
        SUB r1, r5, r7          // Start der Zeichenkette im Puffer
        MOV r2, r7              // Länge der Zeichenkette
        MOV r7, #4              // Systemaufruf write wählen
        SWI #0

        LDR r1, =lb
        MOV r0, #1
        MOV r2, #1
        SWI #0

        LDMFD sp!, {r0-r12, lr} // alle Register wiederherstellen
        MOV pc, lr              // Rücksprung

lut:	.ascii "0123456789abcdef"
lb:  .ascii  "\\n"               // Zeilenumbruch

.data
bufferdec: .space 10            // 10 Byte, denn log_10(2^32) = 10`

const pascal =
`.arm	// Skelett für Aufgabe 8.2

.text

.global _start

_start:

	LDR r0, =13 	// n
	LDR r1, =7	// k
	BL pas		// Routine für Pascal-Loop
	
	MOV r1, r0 	// Wert nach r1 kopieren für dec Ausgabe
	BL dec		// Dezimal Ausgabe von vorigem Blatt

	MOV r0, #0	// exit syscall
	MOV r7, #1
	SWI #0


pas:
	STMFD sp!, {r2-r12, lr} // Register sichern

	CMP r1, #0	// Vergleiche k mit 0
	MOVEQ r0, #1	// Wenn k = 0, ist der Wert... 
	BEQ rec_end	// ...an dieser Stelle 1
	MOVLT r0, #0	// Wenn k < 0, wird der Wert...
	BLT rec_end	// ...mit 0 initialisiert

	CMP r1, r0	// Vergleiche k mit n
	MOVEQ r0, #1	// Wennn k = n, ist der Wert...
	BEQ rec_end	// ...an dieser Stelle 1
	MOVGT r0, #0	// Wenn k > n, wird der Wert...
	BGT rec_end	// ...mit 0 initialisert
	
	CMP r0, #1	// Vergleiche n mit 1
	MOVLE r0, #1	// Wenn n <= 1, ist der Wert...
	BLE rec_end	// ...an dieser Stelle 1
	
	MOV r4, r0	// Werte von n und k werden...
	MOV r5, r1	// ...nach r4 und r5 kopiert
	SUB r0, r4, #1	// n - 1
	SUB r1, r5, #1	// k - 1
	BL pas

	MOV r2, r0	// Wert erster Summand nach r2 kopiert
	MOV r3, r1	// Kopieren nach r3 nicht nötig, kann weggelassen werden
	SUB r0, r4, #1	// n - 1
	MOV r1, r5	// k
	BL pas
	
	ADD r0, r2	// Addition (n-1 / k-1) + (n-1 / k)...
			// ...von rekursiver Formel wird ausgeführt
rec_end:
	LDMFD sp!, {r2-r12, lr} // Gespeicherte Register werden wieder hergestellt
	MOV pc, lr		// Rücksprung

dec:                    // Ganzzahl in r1 (32 Bit, vorzeichenlos)
        STMFD sp!, {r0-r12, lr} // alle Register sichern
        LDR r5,=bufferdec+10    // Zeiger auf Ende des Puffers +1
        MOV r6, #0x30           // ASCII-Kode für 0 als Offset
        MOV r0, #1		// wähle stdout
        MOV r7, #0              // Stellenzähler
	
decloop:
        ADD r7, r7, #1          // nächste Ziffer (mind. eine)
        MOV r2, #10             // Basis 10 (dezimal)
        BL div	                // r1 : r2 von Folie 5
        ADD r4, r6, r1, LSR #16 // Rest als Ziffer in ASCII . . .
        STRB r4, [r5,-r7]       // . . . rückwärts in Puffer schreiben
        BICS r1, r1, #0x000f0000 // Rest löschen
        BNE decloop             // mehr Stellen wenn Quotient > 0
        SUB r1, r5, r7          // Start der Zeichenkette im Puffer
        MOV r2, r7              // Länge der Zeichenkette
        MOV r7, #4              // Systemaufruf write wählen
        SWI #0

        LDR r1, =lb
        MOV r0, #1
        MOV r2, #1
        SWI #0

        LDMFD sp!, {r0-r12, lr} // alle Register wiederherstellen
        MOV pc, lr              // Rücksprung

div:    // Dividend in r1 (16 Bit, vorzeichenlos)
        // Divisor in r2 (16 Bit, vorzeichenlos)

        MOV r2, r2, LSL #16
        MOV r3, #16           // Schleifenzähler
divloop:
        RSBS r1, r2, r1, LSL #1 // schiebe und subtrahiere
        ORRPL r1, r1, #1
        ADDMI r1, r1, r2        // Wiederherstellung des Rests
        SUBS r3, r3, #1
        BNE divloop
                // Quotient in r1_15, . . . , r1_0
                // Rest in r1_31, . . . , r1_16
        MOV pc, lr             // Rücksprung
	
lb:  .ascii  "\\n"               // Zeilenumbruch

.data
	bufferdec: .space 10            // 10 Byte, denn log_10(2^32) = 10`

const pascalSampleSolution =
`.arm

.global _start				
_start:						
	MOV r0, #15	// in Register r0 ist n	
	MOV r1, r0	// Wert von n in Register r1 (=k) kopieren

pasline:
	BL space
pas:
	BL  pasctriangle		// Sprung zur Hauptfunktion
	MOV r4, r2				// Ergebnis fuer Ausgabe in r4 speichern
	BL  hex					// Ausgabe als hex
	SUBS r1, #1				// k-1
	BPL pas					// Schleife für alle k
	SUBS r0, #1				// k-1
	MOV r1, r0
	BPL pasline					// Schleife für alle k

	MOV r1, #0
	MOV r0, #0
 	MOV r7, #1 				// wähle Systemaufruf exit
 	SWI #0

pasctriangle:
	CMP r1, #0				// Test ob r1=0
	BEQ oneorequal			// falls ja, Sonderbehandlung
	CMP r1, r0				// Test of r1=r0
	BEQ oneorequal			// falls ja, Sonderbehandlung
	STMFD sp!, {r0-r1,r3,lr}// sonst, Register r0, r1, r2, r3 und lr sichern
	SUB r0, r0, #1			// r0 dekrementieren
	BL  pasctriangle		// erneuter Aufruf der Hauptfunktion
	MOV r3, r2				// Zwischenspeichern von r2
	SUB r1, r1, #1			// r1 dekrementieren
	BL  pasctriangle		// erneuter Aufruf von Hauptfunktion
	ADD r2, r3				// Addition
	LDMFD sp!, {r0-r1,r3,lr}// Register r0, r1, r2, r3 und lr wiederherstellen
	B   end
oneorequal:					// Sonderbehandlung von r1=0 und r1=r0
	MOV r2, #1
end:
	MOV pc, lr				// Ruecksprung
	
space:
        STMFD sp!, {r0-r12,lr} // Register sichern
        MOV r7, #4 // wähle Systemaufruf write
        MOV r0, #1	// wähle stdout
        MOV r2, #1 // Länge der Zeichenkette
        LDR r1, =lb		
        SWI #0
        LDMFD sp!, {r0-r12, pc} // Register wiederherstellen

hex:
        STMFD sp!, {r0-r12,lr} // Register sichern
        MOV r3, #8 // 8 Hexadezimalstellen
        MOV r7, #4 // wähle Systemaufruf write
        MOV r0, #1	// wähle stdout
        MOV r2, #1 // Länge der Zeichenkette

hexloop:
        LDR r1,=lut // Adresse der Zeichentabelle
        ADD r1, r1, r4, LSR #28 // addiere Bits 28–31 von r4
        SWI #0
        MOV r4, r4, LSL #4 // naechste Hex-Ziffer in Bits 28–31
        SUBS r3, r3, #1
        BNE hexloop

        LDR r1, =lb
        SWI #0

        LDMFD sp!, {r0-r12, pc} // Register wiederherstellen

lut: .ascii "0123456789abcdef"  // Look-Up-Tabelle
lb:  .ascii  "\\n"               // Zeilenumbruch`

const examples = [["Hello World", hello], ["Compare", compare], ["Xmas", xmas], ["Division + Output", div32OutPut], ["Binär + Oktal", binOct],
["Binär + Oktal Full", binOctFull], ["Pascal", pascal], ["Pascal Musterlösung", pascalSampleSolution]]