/* eslint-disable eqeqeq */
import {
  CR,
  LF,
  Control,
  Extend,
  RegionalIndicator,
  SpacingMark,
  L,
  V,
  T,
  LV,
  LVT,
  Other,
  Prepend,
  EBase,
  EModifier,
  ZWJ,
  GlueAfterZwj,
  EBaseGAZ,
} from './classes'

// given a Unicode code point, determines this symbol's grapheme break property
export default function getGraphemeBreakProperty(code: number) {
  // grapheme break property for Unicode 10.0.0,
  // taken from http://www.unicode.org/Public/10.0.0/ucd/auxiliary/GraphemeBreakProperty.txt
  // and adapted to JavaScript rules

  if (
    (0x0600 <= code && code <= 0x0605) || // Cf   [6] ARABIC NUMBER SIGN..ARABIC NUMBER MARK ABOVE
    code == 0x06dd || // Cf       ARABIC END OF AYAH
    code == 0x070f || // Cf       SYRIAC ABBREVIATION MARK
    code == 0x08e2 || // Cf       ARABIC DISPUTED END OF AYAH
    code == 0x0d4e || // Lo       MALAYALAM LETTER DOT REPH
    code == 0x110bd || // Cf       KAITHI NUMBER SIGN
    (0x111c2 <= code && code <= 0x111c3) || // Lo   [2] SHARADA SIGN JIHVAMULIYA..SHARADA SIGN UPADHMANIYA
    code == 0x11a3a || // Lo       ZANABAZAR SQUARE CLUSTER-INITIAL LETTER RA
    (0x11a86 <= code && code <= 0x11a89) || // Lo   [4] SOYOMBO CLUSTER-INITIAL LETTER RA..SOYOMBO CLUSTER-INITIAL LETTER SA
    code == 0x11d46 // Lo       MASARAM GONDI REPHA
  ) {
    return Prepend
  }
  if (
    code == 0x000d // Cc       <control-000D>
  ) {
    return CR
  }

  if (
    code == 0x000a // Cc       <control-000A>
  ) {
    return LF
  }

  if (
    (0x0000 <= code && code <= 0x0009) || // Cc  [10] <control-0000>..<control-0009>
    (0x000b <= code && code <= 0x000c) || // Cc   [2] <control-000B>..<control-000C>
    (0x000e <= code && code <= 0x001f) || // Cc  [18] <control-000E>..<control-001F>
    (0x007f <= code && code <= 0x009f) || // Cc  [33] <control-007F>..<control-009F>
    code == 0x00ad || // Cf       SOFT HYPHEN
    code == 0x061c || // Cf       ARABIC LETTER MARK
    code == 0x180e || // Cf       MONGOLIAN VOWEL SEPARATOR
    code == 0x200b || // Cf       ZERO WIDTH SPACE
    (0x200e <= code && code <= 0x200f) || // Cf   [2] LEFT-TO-RIGHT MARK..RIGHT-TO-LEFT MARK
    code == 0x2028 || // Zl       LINE SEPARATOR
    code == 0x2029 || // Zp       PARAGRAPH SEPARATOR
    (0x202a <= code && code <= 0x202e) || // Cf   [5] LEFT-TO-RIGHT EMBEDDING..RIGHT-TO-LEFT OVERRIDE
    (0x2060 <= code && code <= 0x2064) || // Cf   [5] WORD JOINER..INVISIBLE PLUS
    code == 0x2065 || // Cn       <reserved-2065>
    (0x2066 <= code && code <= 0x206f) || // Cf  [10] LEFT-TO-RIGHT ISOLATE..NOMINAL DIGIT SHAPES
    (0xd800 <= code && code <= 0xdfff) || // Cs [2048] <surrogate-D800>..<surrogate-DFFF>
    code == 0xfeff || // Cf       ZERO WIDTH NO-BREAK SPACE
    (0xfff0 <= code && code <= 0xfff8) || // Cn   [9] <reserved-FFF0>..<reserved-FFF8>
    (0xfff9 <= code && code <= 0xfffb) || // Cf   [3] INTERLINEAR ANNOTATION ANCHOR..INTERLINEAR ANNOTATION TERMINATOR
    (0x1bca0 <= code && code <= 0x1bca3) || // Cf   [4] SHORTHAND FORMAT LETTER OVERLAP..SHORTHAND FORMAT UP STEP
    (0x1d173 <= code && code <= 0x1d17a) || // Cf   [8] MUSICAL SYMBOL BEGIN BEAM..MUSICAL SYMBOL END PHRASE
    code == 0xe0000 || // Cn       <reserved-E0000>
    code == 0xe0001 || // Cf       LANGUAGE TAG
    (0xe0002 <= code && code <= 0xe001f) || // Cn  [30] <reserved-E0002>..<reserved-E001F>
    (0xe0080 <= code && code <= 0xe00ff) || // Cn [128] <reserved-E0080>..<reserved-E00FF>
    (0xe01f0 <= code && code <= 0xe0fff) // Cn [3600] <reserved-E01F0>..<reserved-E0FFF>
  ) {
    return Control
  }

  if (
    (0x0300 <= code && code <= 0x036f) || // Mn [112] COMBINING GRAVE ACCENT..COMBINING LATIN SMALL LETTER X
    (0x0483 <= code && code <= 0x0487) || // Mn   [5] COMBINING CYRILLIC TITLO..COMBINING CYRILLIC POKRYTIE
    (0x0488 <= code && code <= 0x0489) || // Me   [2] COMBINING CYRILLIC HUNDRED THOUSANDS SIGN..COMBINING CYRILLIC MILLIONS SIGN
    (0x0591 <= code && code <= 0x05bd) || // Mn  [45] HEBREW ACCENT ETNAHTA..HEBREW POINT METEG
    code == 0x05bf || // Mn       HEBREW POINT RAFE
    (0x05c1 <= code && code <= 0x05c2) || // Mn   [2] HEBREW POINT SHIN DOT..HEBREW POINT SIN DOT
    (0x05c4 <= code && code <= 0x05c5) || // Mn   [2] HEBREW MARK UPPER DOT..HEBREW MARK LOWER DOT
    code == 0x05c7 || // Mn       HEBREW POINT QAMATS QATAN
    (0x0610 <= code && code <= 0x061a) || // Mn  [11] ARABIC SIGN SALLALLAHOU ALAYHE WASSALLAM..ARABIC SMALL KASRA
    (0x064b <= code && code <= 0x065f) || // Mn  [21] ARABIC FATHATAN..ARABIC WAVY HAMZA BELOW
    code == 0x0670 || // Mn       ARABIC LETTER SUPERSCRIPT ALEF
    (0x06d6 <= code && code <= 0x06dc) || // Mn   [7] ARABIC SMALL HIGH LIGATURE SAD WITH LAM WITH ALEF MAKSURA..ARABIC SMALL HIGH SEEN
    (0x06df <= code && code <= 0x06e4) || // Mn   [6] ARABIC SMALL HIGH ROUNDED ZERO..ARABIC SMALL HIGH MADDA
    (0x06e7 <= code && code <= 0x06e8) || // Mn   [2] ARABIC SMALL HIGH YEH..ARABIC SMALL HIGH NOON
    (0x06ea <= code && code <= 0x06ed) || // Mn   [4] ARABIC EMPTY CENTRE LOW STOP..ARABIC SMALL LOW MEEM
    code == 0x0711 || // Mn       SYRIAC LETTER SUPERSCRIPT ALAPH
    (0x0730 <= code && code <= 0x074a) || // Mn  [27] SYRIAC PTHAHA ABOVE..SYRIAC BARREKH
    (0x07a6 <= code && code <= 0x07b0) || // Mn  [11] THAANA ABAFILI..THAANA SUKUN
    (0x07eb <= code && code <= 0x07f3) || // Mn   [9] NKO COMBINING SHORT HIGH TONE..NKO COMBINING DOUBLE DOT ABOVE
    (0x0816 <= code && code <= 0x0819) || // Mn   [4] SAMARITAN MARK IN..SAMARITAN MARK DAGESH
    (0x081b <= code && code <= 0x0823) || // Mn   [9] SAMARITAN MARK EPENTHETIC YUT..SAMARITAN VOWEL SIGN A
    (0x0825 <= code && code <= 0x0827) || // Mn   [3] SAMARITAN VOWEL SIGN SHORT A..SAMARITAN VOWEL SIGN U
    (0x0829 <= code && code <= 0x082d) || // Mn   [5] SAMARITAN VOWEL SIGN LONG I..SAMARITAN MARK NEQUDAA
    (0x0859 <= code && code <= 0x085b) || // Mn   [3] MANDAIC AFFRICATION MARK..MANDAIC GEMINATION MARK
    (0x08d4 <= code && code <= 0x08e1) || // Mn  [14] ARABIC SMALL HIGH WORD AR-RUB..ARABIC SMALL HIGH SIGN SAFHA
    (0x08e3 <= code && code <= 0x0902) || // Mn  [32] ARABIC TURNED DAMMA BELOW..DEVANAGARI SIGN ANUSVARA
    code == 0x093a || // Mn       DEVANAGARI VOWEL SIGN OE
    code == 0x093c || // Mn       DEVANAGARI SIGN NUKTA
    (0x0941 <= code && code <= 0x0948) || // Mn   [8] DEVANAGARI VOWEL SIGN U..DEVANAGARI VOWEL SIGN AI
    code == 0x094d || // Mn       DEVANAGARI SIGN VIRAMA
    (0x0951 <= code && code <= 0x0957) || // Mn   [7] DEVANAGARI STRESS SIGN UDATTA..DEVANAGARI VOWEL SIGN UUE
    (0x0962 <= code && code <= 0x0963) || // Mn   [2] DEVANAGARI VOWEL SIGN VOCALIC L..DEVANAGARI VOWEL SIGN VOCALIC LL
    code == 0x0981 || // Mn       BENGALI SIGN CANDRABINDU
    code == 0x09bc || // Mn       BENGALI SIGN NUKTA
    code == 0x09be || // Mc       BENGALI VOWEL SIGN AA
    (0x09c1 <= code && code <= 0x09c4) || // Mn   [4] BENGALI VOWEL SIGN U..BENGALI VOWEL SIGN VOCALIC RR
    code == 0x09cd || // Mn       BENGALI SIGN VIRAMA
    code == 0x09d7 || // Mc       BENGALI AU LENGTH MARK
    (0x09e2 <= code && code <= 0x09e3) || // Mn   [2] BENGALI VOWEL SIGN VOCALIC L..BENGALI VOWEL SIGN VOCALIC LL
    (0x0a01 <= code && code <= 0x0a02) || // Mn   [2] GURMUKHI SIGN ADAK BINDI..GURMUKHI SIGN BINDI
    code == 0x0a3c || // Mn       GURMUKHI SIGN NUKTA
    (0x0a41 <= code && code <= 0x0a42) || // Mn   [2] GURMUKHI VOWEL SIGN U..GURMUKHI VOWEL SIGN UU
    (0x0a47 <= code && code <= 0x0a48) || // Mn   [2] GURMUKHI VOWEL SIGN EE..GURMUKHI VOWEL SIGN AI
    (0x0a4b <= code && code <= 0x0a4d) || // Mn   [3] GURMUKHI VOWEL SIGN OO..GURMUKHI SIGN VIRAMA
    code == 0x0a51 || // Mn       GURMUKHI SIGN UDAAT
    (0x0a70 <= code && code <= 0x0a71) || // Mn   [2] GURMUKHI TIPPI..GURMUKHI ADDAK
    code == 0x0a75 || // Mn       GURMUKHI SIGN YAKASH
    (0x0a81 <= code && code <= 0x0a82) || // Mn   [2] GUJARATI SIGN CANDRABINDU..GUJARATI SIGN ANUSVARA
    code == 0x0abc || // Mn       GUJARATI SIGN NUKTA
    (0x0ac1 <= code && code <= 0x0ac5) || // Mn   [5] GUJARATI VOWEL SIGN U..GUJARATI VOWEL SIGN CANDRA E
    (0x0ac7 <= code && code <= 0x0ac8) || // Mn   [2] GUJARATI VOWEL SIGN E..GUJARATI VOWEL SIGN AI
    code == 0x0acd || // Mn       GUJARATI SIGN VIRAMA
    (0x0ae2 <= code && code <= 0x0ae3) || // Mn   [2] GUJARATI VOWEL SIGN VOCALIC L..GUJARATI VOWEL SIGN VOCALIC LL
    (0x0afa <= code && code <= 0x0aff) || // Mn   [6] GUJARATI SIGN SUKUN..GUJARATI SIGN TWO-CIRCLE NUKTA ABOVE
    code == 0x0b01 || // Mn       ORIYA SIGN CANDRABINDU
    code == 0x0b3c || // Mn       ORIYA SIGN NUKTA
    code == 0x0b3e || // Mc       ORIYA VOWEL SIGN AA
    code == 0x0b3f || // Mn       ORIYA VOWEL SIGN I
    (0x0b41 <= code && code <= 0x0b44) || // Mn   [4] ORIYA VOWEL SIGN U..ORIYA VOWEL SIGN VOCALIC RR
    code == 0x0b4d || // Mn       ORIYA SIGN VIRAMA
    code == 0x0b56 || // Mn       ORIYA AI LENGTH MARK
    code == 0x0b57 || // Mc       ORIYA AU LENGTH MARK
    (0x0b62 <= code && code <= 0x0b63) || // Mn   [2] ORIYA VOWEL SIGN VOCALIC L..ORIYA VOWEL SIGN VOCALIC LL
    code == 0x0b82 || // Mn       TAMIL SIGN ANUSVARA
    code == 0x0bbe || // Mc       TAMIL VOWEL SIGN AA
    code == 0x0bc0 || // Mn       TAMIL VOWEL SIGN II
    code == 0x0bcd || // Mn       TAMIL SIGN VIRAMA
    code == 0x0bd7 || // Mc       TAMIL AU LENGTH MARK
    code == 0x0c00 || // Mn       TELUGU SIGN COMBINING CANDRABINDU ABOVE
    (0x0c3e <= code && code <= 0x0c40) || // Mn   [3] TELUGU VOWEL SIGN AA..TELUGU VOWEL SIGN II
    (0x0c46 <= code && code <= 0x0c48) || // Mn   [3] TELUGU VOWEL SIGN E..TELUGU VOWEL SIGN AI
    (0x0c4a <= code && code <= 0x0c4d) || // Mn   [4] TELUGU VOWEL SIGN O..TELUGU SIGN VIRAMA
    (0x0c55 <= code && code <= 0x0c56) || // Mn   [2] TELUGU LENGTH MARK..TELUGU AI LENGTH MARK
    (0x0c62 <= code && code <= 0x0c63) || // Mn   [2] TELUGU VOWEL SIGN VOCALIC L..TELUGU VOWEL SIGN VOCALIC LL
    code == 0x0c81 || // Mn       KANNADA SIGN CANDRABINDU
    code == 0x0cbc || // Mn       KANNADA SIGN NUKTA
    code == 0x0cbf || // Mn       KANNADA VOWEL SIGN I
    code == 0x0cc2 || // Mc       KANNADA VOWEL SIGN UU
    code == 0x0cc6 || // Mn       KANNADA VOWEL SIGN E
    (0x0ccc <= code && code <= 0x0ccd) || // Mn   [2] KANNADA VOWEL SIGN AU..KANNADA SIGN VIRAMA
    (0x0cd5 <= code && code <= 0x0cd6) || // Mc   [2] KANNADA LENGTH MARK..KANNADA AI LENGTH MARK
    (0x0ce2 <= code && code <= 0x0ce3) || // Mn   [2] KANNADA VOWEL SIGN VOCALIC L..KANNADA VOWEL SIGN VOCALIC LL
    (0x0d00 <= code && code <= 0x0d01) || // Mn   [2] MALAYALAM SIGN COMBINING ANUSVARA ABOVE..MALAYALAM SIGN CANDRABINDU
    (0x0d3b <= code && code <= 0x0d3c) || // Mn   [2] MALAYALAM SIGN VERTICAL BAR VIRAMA..MALAYALAM SIGN CIRCULAR VIRAMA
    code == 0x0d3e || // Mc       MALAYALAM VOWEL SIGN AA
    (0x0d41 <= code && code <= 0x0d44) || // Mn   [4] MALAYALAM VOWEL SIGN U..MALAYALAM VOWEL SIGN VOCALIC RR
    code == 0x0d4d || // Mn       MALAYALAM SIGN VIRAMA
    code == 0x0d57 || // Mc       MALAYALAM AU LENGTH MARK
    (0x0d62 <= code && code <= 0x0d63) || // Mn   [2] MALAYALAM VOWEL SIGN VOCALIC L..MALAYALAM VOWEL SIGN VOCALIC LL
    code == 0x0dca || // Mn       SINHALA SIGN AL-LAKUNA
    code == 0x0dcf || // Mc       SINHALA VOWEL SIGN AELA-PILLA
    (0x0dd2 <= code && code <= 0x0dd4) || // Mn   [3] SINHALA VOWEL SIGN KETTI IS-PILLA..SINHALA VOWEL SIGN KETTI PAA-PILLA
    code == 0x0dd6 || // Mn       SINHALA VOWEL SIGN DIGA PAA-PILLA
    code == 0x0ddf || // Mc       SINHALA VOWEL SIGN GAYANUKITTA
    code == 0x0e31 || // Mn       THAI CHARACTER MAI HAN-AKAT
    (0x0e34 <= code && code <= 0x0e3a) || // Mn   [7] THAI CHARACTER SARA I..THAI CHARACTER PHINTHU
    (0x0e47 <= code && code <= 0x0e4e) || // Mn   [8] THAI CHARACTER MAITAIKHU..THAI CHARACTER YAMAKKAN
    code == 0x0eb1 || // Mn       LAO VOWEL SIGN MAI KAN
    (0x0eb4 <= code && code <= 0x0eb9) || // Mn   [6] LAO VOWEL SIGN I..LAO VOWEL SIGN UU
    (0x0ebb <= code && code <= 0x0ebc) || // Mn   [2] LAO VOWEL SIGN MAI KON..LAO SEMIVOWEL SIGN LO
    (0x0ec8 <= code && code <= 0x0ecd) || // Mn   [6] LAO TONE MAI EK..LAO NIGGAHITA
    (0x0f18 <= code && code <= 0x0f19) || // Mn   [2] TIBETAN ASTROLOGICAL SIGN -KHYUD PA..TIBETAN ASTROLOGICAL SIGN SDONG TSHUGS
    code == 0x0f35 || // Mn       TIBETAN MARK NGAS BZUNG NYI ZLA
    code == 0x0f37 || // Mn       TIBETAN MARK NGAS BZUNG SGOR RTAGS
    code == 0x0f39 || // Mn       TIBETAN MARK TSA -PHRU
    (0x0f71 <= code && code <= 0x0f7e) || // Mn  [14] TIBETAN VOWEL SIGN AA..TIBETAN SIGN RJES SU NGA RO
    (0x0f80 <= code && code <= 0x0f84) || // Mn   [5] TIBETAN VOWEL SIGN REVERSED I..TIBETAN MARK HALANTA
    (0x0f86 <= code && code <= 0x0f87) || // Mn   [2] TIBETAN SIGN LCI RTAGS..TIBETAN SIGN YANG RTAGS
    (0x0f8d <= code && code <= 0x0f97) || // Mn  [11] TIBETAN SUBJOINED SIGN LCE TSA CAN..TIBETAN SUBJOINED LETTER JA
    (0x0f99 <= code && code <= 0x0fbc) || // Mn  [36] TIBETAN SUBJOINED LETTER NYA..TIBETAN SUBJOINED LETTER FIXED-FORM RA
    code == 0x0fc6 || // Mn       TIBETAN SYMBOL PADMA GDAN
    (0x102d <= code && code <= 0x1030) || // Mn   [4] MYANMAR VOWEL SIGN I..MYANMAR VOWEL SIGN UU
    (0x1032 <= code && code <= 0x1037) || // Mn   [6] MYANMAR VOWEL SIGN AI..MYANMAR SIGN DOT BELOW
    (0x1039 <= code && code <= 0x103a) || // Mn   [2] MYANMAR SIGN VIRAMA..MYANMAR SIGN ASAT
    (0x103d <= code && code <= 0x103e) || // Mn   [2] MYANMAR CONSONANT SIGN MEDIAL WA..MYANMAR CONSONANT SIGN MEDIAL HA
    (0x1058 <= code && code <= 0x1059) || // Mn   [2] MYANMAR VOWEL SIGN VOCALIC L..MYANMAR VOWEL SIGN VOCALIC LL
    (0x105e <= code && code <= 0x1060) || // Mn   [3] MYANMAR CONSONANT SIGN MON MEDIAL NA..MYANMAR CONSONANT SIGN MON MEDIAL LA
    (0x1071 <= code && code <= 0x1074) || // Mn   [4] MYANMAR VOWEL SIGN GEBA KAREN I..MYANMAR VOWEL SIGN KAYAH EE
    code == 0x1082 || // Mn       MYANMAR CONSONANT SIGN SHAN MEDIAL WA
    (0x1085 <= code && code <= 0x1086) || // Mn   [2] MYANMAR VOWEL SIGN SHAN E ABOVE..MYANMAR VOWEL SIGN SHAN FINAL Y
    code == 0x108d || // Mn       MYANMAR SIGN SHAN COUNCIL EMPHATIC TONE
    code == 0x109d || // Mn       MYANMAR VOWEL SIGN AITON AI
    (0x135d <= code && code <= 0x135f) || // Mn   [3] ETHIOPIC COMBINING GEMINATION AND VOWEL LENGTH MARK..ETHIOPIC COMBINING GEMINATION MARK
    (0x1712 <= code && code <= 0x1714) || // Mn   [3] TAGALOG VOWEL SIGN I..TAGALOG SIGN VIRAMA
    (0x1732 <= code && code <= 0x1734) || // Mn   [3] HANUNOO VOWEL SIGN I..HANUNOO SIGN PAMUDPOD
    (0x1752 <= code && code <= 0x1753) || // Mn   [2] BUHID VOWEL SIGN I..BUHID VOWEL SIGN U
    (0x1772 <= code && code <= 0x1773) || // Mn   [2] TAGBANWA VOWEL SIGN I..TAGBANWA VOWEL SIGN U
    (0x17b4 <= code && code <= 0x17b5) || // Mn   [2] KHMER VOWEL INHERENT AQ..KHMER VOWEL INHERENT AA
    (0x17b7 <= code && code <= 0x17bd) || // Mn   [7] KHMER VOWEL SIGN I..KHMER VOWEL SIGN UA
    code == 0x17c6 || // Mn       KHMER SIGN NIKAHIT
    (0x17c9 <= code && code <= 0x17d3) || // Mn  [11] KHMER SIGN MUUSIKATOAN..KHMER SIGN BATHAMASAT
    code == 0x17dd || // Mn       KHMER SIGN ATTHACAN
    (0x180b <= code && code <= 0x180d) || // Mn   [3] MONGOLIAN FREE VARIATION SELECTOR ONE..MONGOLIAN FREE VARIATION SELECTOR THREE
    (0x1885 <= code && code <= 0x1886) || // Mn   [2] MONGOLIAN LETTER ALI GALI BALUDA..MONGOLIAN LETTER ALI GALI THREE BALUDA
    code == 0x18a9 || // Mn       MONGOLIAN LETTER ALI GALI DAGALGA
    (0x1920 <= code && code <= 0x1922) || // Mn   [3] LIMBU VOWEL SIGN A..LIMBU VOWEL SIGN U
    (0x1927 <= code && code <= 0x1928) || // Mn   [2] LIMBU VOWEL SIGN E..LIMBU VOWEL SIGN O
    code == 0x1932 || // Mn       LIMBU SMALL LETTER ANUSVARA
    (0x1939 <= code && code <= 0x193b) || // Mn   [3] LIMBU SIGN MUKPHRENG..LIMBU SIGN SA-I
    (0x1a17 <= code && code <= 0x1a18) || // Mn   [2] BUGINESE VOWEL SIGN I..BUGINESE VOWEL SIGN U
    code == 0x1a1b || // Mn       BUGINESE VOWEL SIGN AE
    code == 0x1a56 || // Mn       TAI THAM CONSONANT SIGN MEDIAL LA
    (0x1a58 <= code && code <= 0x1a5e) || // Mn   [7] TAI THAM SIGN MAI KANG LAI..TAI THAM CONSONANT SIGN SA
    code == 0x1a60 || // Mn       TAI THAM SIGN SAKOT
    code == 0x1a62 || // Mn       TAI THAM VOWEL SIGN MAI SAT
    (0x1a65 <= code && code <= 0x1a6c) || // Mn   [8] TAI THAM VOWEL SIGN I..TAI THAM VOWEL SIGN OA BELOW
    (0x1a73 <= code && code <= 0x1a7c) || // Mn  [10] TAI THAM VOWEL SIGN OA ABOVE..TAI THAM SIGN KHUEN-LUE KARAN
    code == 0x1a7f || // Mn       TAI THAM COMBINING CRYPTOGRAMMIC DOT
    (0x1ab0 <= code && code <= 0x1abd) || // Mn  [14] COMBINING DOUBLED CIRCUMFLEX ACCENT..COMBINING PARENTHESES BELOW
    code == 0x1abe || // Me       COMBINING PARENTHESES OVERLAY
    (0x1b00 <= code && code <= 0x1b03) || // Mn   [4] BALINESE SIGN ULU RICEM..BALINESE SIGN SURANG
    code == 0x1b34 || // Mn       BALINESE SIGN REREKAN
    (0x1b36 <= code && code <= 0x1b3a) || // Mn   [5] BALINESE VOWEL SIGN ULU..BALINESE VOWEL SIGN RA REPA
    code == 0x1b3c || // Mn       BALINESE VOWEL SIGN LA LENGA
    code == 0x1b42 || // Mn       BALINESE VOWEL SIGN PEPET
    (0x1b6b <= code && code <= 0x1b73) || // Mn   [9] BALINESE MUSICAL SYMBOL COMBINING TEGEH..BALINESE MUSICAL SYMBOL COMBINING GONG
    (0x1b80 <= code && code <= 0x1b81) || // Mn   [2] SUNDANESE SIGN PANYECEK..SUNDANESE SIGN PANGLAYAR
    (0x1ba2 <= code && code <= 0x1ba5) || // Mn   [4] SUNDANESE CONSONANT SIGN PANYAKRA..SUNDANESE VOWEL SIGN PANYUKU
    (0x1ba8 <= code && code <= 0x1ba9) || // Mn   [2] SUNDANESE VOWEL SIGN PAMEPET..SUNDANESE VOWEL SIGN PANEULEUNG
    (0x1bab <= code && code <= 0x1bad) || // Mn   [3] SUNDANESE SIGN VIRAMA..SUNDANESE CONSONANT SIGN PASANGAN WA
    code == 0x1be6 || // Mn       BATAK SIGN TOMPI
    (0x1be8 <= code && code <= 0x1be9) || // Mn   [2] BATAK VOWEL SIGN PAKPAK E..BATAK VOWEL SIGN EE
    code == 0x1bed || // Mn       BATAK VOWEL SIGN KARO O
    (0x1bef <= code && code <= 0x1bf1) || // Mn   [3] BATAK VOWEL SIGN U FOR SIMALUNGUN SA..BATAK CONSONANT SIGN H
    (0x1c2c <= code && code <= 0x1c33) || // Mn   [8] LEPCHA VOWEL SIGN E..LEPCHA CONSONANT SIGN T
    (0x1c36 <= code && code <= 0x1c37) || // Mn   [2] LEPCHA SIGN RAN..LEPCHA SIGN NUKTA
    (0x1cd0 <= code && code <= 0x1cd2) || // Mn   [3] VEDIC TONE KARSHANA..VEDIC TONE PRENKHA
    (0x1cd4 <= code && code <= 0x1ce0) || // Mn  [13] VEDIC SIGN YAJURVEDIC MIDLINE SVARITA..VEDIC TONE RIGVEDIC KASHMIRI INDEPENDENT SVARITA
    (0x1ce2 <= code && code <= 0x1ce8) || // Mn   [7] VEDIC SIGN VISARGA SVARITA..VEDIC SIGN VISARGA ANUDATTA WITH TAIL
    code == 0x1ced || // Mn       VEDIC SIGN TIRYAK
    code == 0x1cf4 || // Mn       VEDIC TONE CANDRA ABOVE
    (0x1cf8 <= code && code <= 0x1cf9) || // Mn   [2] VEDIC TONE RING ABOVE..VEDIC TONE DOUBLE RING ABOVE
    (0x1dc0 <= code && code <= 0x1df9) || // Mn  [58] COMBINING DOTTED GRAVE ACCENT..COMBINING WIDE INVERTED BRIDGE BELOW
    (0x1dfb <= code && code <= 0x1dff) || // Mn   [5] COMBINING DELETION MARK..COMBINING RIGHT ARROWHEAD AND DOWN ARROWHEAD BELOW
    code == 0x200c || // Cf       ZERO WIDTH NON-JOINER
    (0x20d0 <= code && code <= 0x20dc) || // Mn  [13] COMBINING LEFT HARPOON ABOVE..COMBINING FOUR DOTS ABOVE
    (0x20dd <= code && code <= 0x20e0) || // Me   [4] COMBINING ENCLOSING CIRCLE..COMBINING ENCLOSING CIRCLE BACKSLASH
    code == 0x20e1 || // Mn       COMBINING LEFT RIGHT ARROW ABOVE
    (0x20e2 <= code && code <= 0x20e4) || // Me   [3] COMBINING ENCLOSING SCREEN..COMBINING ENCLOSING UPWARD POINTING TRIANGLE
    (0x20e5 <= code && code <= 0x20f0) || // Mn  [12] COMBINING REVERSE SOLIDUS OVERLAY..COMBINING ASTERISK ABOVE
    (0x2cef <= code && code <= 0x2cf1) || // Mn   [3] COPTIC COMBINING NI ABOVE..COPTIC COMBINING SPIRITUS LENIS
    code == 0x2d7f || // Mn       TIFINAGH CONSONANT JOINER
    (0x2de0 <= code && code <= 0x2dff) || // Mn  [32] COMBINING CYRILLIC LETTER BE..COMBINING CYRILLIC LETTER IOTIFIED BIG YUS
    (0x302a <= code && code <= 0x302d) || // Mn   [4] IDEOGRAPHIC LEVEL TONE MARK..IDEOGRAPHIC ENTERING TONE MARK
    (0x302e <= code && code <= 0x302f) || // Mc   [2] HANGUL SINGLE DOT TONE MARK..HANGUL DOUBLE DOT TONE MARK
    (0x3099 <= code && code <= 0x309a) || // Mn   [2] COMBINING KATAKANA-HIRAGANA VOICED SOUND MARK..COMBINING KATAKANA-HIRAGANA SEMI-VOICED SOUND MARK
    code == 0xa66f || // Mn       COMBINING CYRILLIC VZMET
    (0xa670 <= code && code <= 0xa672) || // Me   [3] COMBINING CYRILLIC TEN MILLIONS SIGN..COMBINING CYRILLIC THOUSAND MILLIONS SIGN
    (0xa674 <= code && code <= 0xa67d) || // Mn  [10] COMBINING CYRILLIC LETTER UKRAINIAN IE..COMBINING CYRILLIC PAYEROK
    (0xa69e <= code && code <= 0xa69f) || // Mn   [2] COMBINING CYRILLIC LETTER EF..COMBINING CYRILLIC LETTER IOTIFIED E
    (0xa6f0 <= code && code <= 0xa6f1) || // Mn   [2] BAMUM COMBINING MARK KOQNDON..BAMUM COMBINING MARK TUKWENTIS
    code == 0xa802 || // Mn       SYLOTI NAGRI SIGN DVISVARA
    code == 0xa806 || // Mn       SYLOTI NAGRI SIGN HASANTA
    code == 0xa80b || // Mn       SYLOTI NAGRI SIGN ANUSVARA
    (0xa825 <= code && code <= 0xa826) || // Mn   [2] SYLOTI NAGRI VOWEL SIGN U..SYLOTI NAGRI VOWEL SIGN E
    (0xa8c4 <= code && code <= 0xa8c5) || // Mn   [2] SAURASHTRA SIGN VIRAMA..SAURASHTRA SIGN CANDRABINDU
    (0xa8e0 <= code && code <= 0xa8f1) || // Mn  [18] COMBINING DEVANAGARI DIGIT ZERO..COMBINING DEVANAGARI SIGN AVAGRAHA
    (0xa926 <= code && code <= 0xa92d) || // Mn   [8] KAYAH LI VOWEL UE..KAYAH LI TONE CALYA PLOPHU
    (0xa947 <= code && code <= 0xa951) || // Mn  [11] REJANG VOWEL SIGN I..REJANG CONSONANT SIGN R
    (0xa980 <= code && code <= 0xa982) || // Mn   [3] JAVANESE SIGN PANYANGGA..JAVANESE SIGN LAYAR
    code == 0xa9b3 || // Mn       JAVANESE SIGN CECAK TELU
    (0xa9b6 <= code && code <= 0xa9b9) || // Mn   [4] JAVANESE VOWEL SIGN WULU..JAVANESE VOWEL SIGN SUKU MENDUT
    code == 0xa9bc || // Mn       JAVANESE VOWEL SIGN PEPET
    code == 0xa9e5 || // Mn       MYANMAR SIGN SHAN SAW
    (0xaa29 <= code && code <= 0xaa2e) || // Mn   [6] CHAM VOWEL SIGN AA..CHAM VOWEL SIGN OE
    (0xaa31 <= code && code <= 0xaa32) || // Mn   [2] CHAM VOWEL SIGN AU..CHAM VOWEL SIGN UE
    (0xaa35 <= code && code <= 0xaa36) || // Mn   [2] CHAM CONSONANT SIGN LA..CHAM CONSONANT SIGN WA
    code == 0xaa43 || // Mn       CHAM CONSONANT SIGN FINAL NG
    code == 0xaa4c || // Mn       CHAM CONSONANT SIGN FINAL M
    code == 0xaa7c || // Mn       MYANMAR SIGN TAI LAING TONE-2
    code == 0xaab0 || // Mn       TAI VIET MAI KANG
    (0xaab2 <= code && code <= 0xaab4) || // Mn   [3] TAI VIET VOWEL I..TAI VIET VOWEL U
    (0xaab7 <= code && code <= 0xaab8) || // Mn   [2] TAI VIET MAI KHIT..TAI VIET VOWEL IA
    (0xaabe <= code && code <= 0xaabf) || // Mn   [2] TAI VIET VOWEL AM..TAI VIET TONE MAI EK
    code == 0xaac1 || // Mn       TAI VIET TONE MAI THO
    (0xaaec <= code && code <= 0xaaed) || // Mn   [2] MEETEI MAYEK VOWEL SIGN UU..MEETEI MAYEK VOWEL SIGN AAI
    code == 0xaaf6 || // Mn       MEETEI MAYEK VIRAMA
    code == 0xabe5 || // Mn       MEETEI MAYEK VOWEL SIGN ANAP
    code == 0xabe8 || // Mn       MEETEI MAYEK VOWEL SIGN UNAP
    code == 0xabed || // Mn       MEETEI MAYEK APUN IYEK
    code == 0xfb1e || // Mn       HEBREW POINT JUDEO-SPANISH VARIKA
    (0xfe00 <= code && code <= 0xfe0f) || // Mn  [16] VARIATION SELECTOR-1..VARIATION SELECTOR-16
    (0xfe20 <= code && code <= 0xfe2f) || // Mn  [16] COMBINING LIGATURE LEFT HALF..COMBINING CYRILLIC TITLO RIGHT HALF
    (0xff9e <= code && code <= 0xff9f) || // Lm   [2] HALFWIDTH KATAKANA VOICED SOUND MARK..HALFWIDTH KATAKANA SEMI-VOICED SOUND MARK
    code == 0x101fd || // Mn       PHAISTOS DISC SIGN COMBINING OBLIQUE STROKE
    code == 0x102e0 || // Mn       COPTIC EPACT THOUSANDS MARK
    (0x10376 <= code && code <= 0x1037a) || // Mn   [5] COMBINING OLD PERMIC LETTER AN..COMBINING OLD PERMIC LETTER SII
    (0x10a01 <= code && code <= 0x10a03) || // Mn   [3] KHAROSHTHI VOWEL SIGN I..KHAROSHTHI VOWEL SIGN VOCALIC R
    (0x10a05 <= code && code <= 0x10a06) || // Mn   [2] KHAROSHTHI VOWEL SIGN E..KHAROSHTHI VOWEL SIGN O
    (0x10a0c <= code && code <= 0x10a0f) || // Mn   [4] KHAROSHTHI VOWEL LENGTH MARK..KHAROSHTHI SIGN VISARGA
    (0x10a38 <= code && code <= 0x10a3a) || // Mn   [3] KHAROSHTHI SIGN BAR ABOVE..KHAROSHTHI SIGN DOT BELOW
    code == 0x10a3f || // Mn       KHAROSHTHI VIRAMA
    (0x10ae5 <= code && code <= 0x10ae6) || // Mn   [2] MANICHAEAN ABBREVIATION MARK ABOVE..MANICHAEAN ABBREVIATION MARK BELOW
    code == 0x11001 || // Mn       BRAHMI SIGN ANUSVARA
    (0x11038 <= code && code <= 0x11046) || // Mn  [15] BRAHMI VOWEL SIGN AA..BRAHMI VIRAMA
    (0x1107f <= code && code <= 0x11081) || // Mn   [3] BRAHMI NUMBER JOINER..KAITHI SIGN ANUSVARA
    (0x110b3 <= code && code <= 0x110b6) || // Mn   [4] KAITHI VOWEL SIGN U..KAITHI VOWEL SIGN AI
    (0x110b9 <= code && code <= 0x110ba) || // Mn   [2] KAITHI SIGN VIRAMA..KAITHI SIGN NUKTA
    (0x11100 <= code && code <= 0x11102) || // Mn   [3] CHAKMA SIGN CANDRABINDU..CHAKMA SIGN VISARGA
    (0x11127 <= code && code <= 0x1112b) || // Mn   [5] CHAKMA VOWEL SIGN A..CHAKMA VOWEL SIGN UU
    (0x1112d <= code && code <= 0x11134) || // Mn   [8] CHAKMA VOWEL SIGN AI..CHAKMA MAAYYAA
    code == 0x11173 || // Mn       MAHAJANI SIGN NUKTA
    (0x11180 <= code && code <= 0x11181) || // Mn   [2] SHARADA SIGN CANDRABINDU..SHARADA SIGN ANUSVARA
    (0x111b6 <= code && code <= 0x111be) || // Mn   [9] SHARADA VOWEL SIGN U..SHARADA VOWEL SIGN O
    (0x111ca <= code && code <= 0x111cc) || // Mn   [3] SHARADA SIGN NUKTA..SHARADA EXTRA SHORT VOWEL MARK
    (0x1122f <= code && code <= 0x11231) || // Mn   [3] KHOJKI VOWEL SIGN U..KHOJKI VOWEL SIGN AI
    code == 0x11234 || // Mn       KHOJKI SIGN ANUSVARA
    (0x11236 <= code && code <= 0x11237) || // Mn   [2] KHOJKI SIGN NUKTA..KHOJKI SIGN SHADDA
    code == 0x1123e || // Mn       KHOJKI SIGN SUKUN
    code == 0x112df || // Mn       KHUDAWADI SIGN ANUSVARA
    (0x112e3 <= code && code <= 0x112ea) || // Mn   [8] KHUDAWADI VOWEL SIGN U..KHUDAWADI SIGN VIRAMA
    (0x11300 <= code && code <= 0x11301) || // Mn   [2] GRANTHA SIGN COMBINING ANUSVARA ABOVE..GRANTHA SIGN CANDRABINDU
    code == 0x1133c || // Mn       GRANTHA SIGN NUKTA
    code == 0x1133e || // Mc       GRANTHA VOWEL SIGN AA
    code == 0x11340 || // Mn       GRANTHA VOWEL SIGN II
    code == 0x11357 || // Mc       GRANTHA AU LENGTH MARK
    (0x11366 <= code && code <= 0x1136c) || // Mn   [7] COMBINING GRANTHA DIGIT ZERO..COMBINING GRANTHA DIGIT SIX
    (0x11370 <= code && code <= 0x11374) || // Mn   [5] COMBINING GRANTHA LETTER A..COMBINING GRANTHA LETTER PA
    (0x11438 <= code && code <= 0x1143f) || // Mn   [8] NEWA VOWEL SIGN U..NEWA VOWEL SIGN AI
    (0x11442 <= code && code <= 0x11444) || // Mn   [3] NEWA SIGN VIRAMA..NEWA SIGN ANUSVARA
    code == 0x11446 || // Mn       NEWA SIGN NUKTA
    code == 0x114b0 || // Mc       TIRHUTA VOWEL SIGN AA
    (0x114b3 <= code && code <= 0x114b8) || // Mn   [6] TIRHUTA VOWEL SIGN U..TIRHUTA VOWEL SIGN VOCALIC LL
    code == 0x114ba || // Mn       TIRHUTA VOWEL SIGN SHORT E
    code == 0x114bd || // Mc       TIRHUTA VOWEL SIGN SHORT O
    (0x114bf <= code && code <= 0x114c0) || // Mn   [2] TIRHUTA SIGN CANDRABINDU..TIRHUTA SIGN ANUSVARA
    (0x114c2 <= code && code <= 0x114c3) || // Mn   [2] TIRHUTA SIGN VIRAMA..TIRHUTA SIGN NUKTA
    code == 0x115af || // Mc       SIDDHAM VOWEL SIGN AA
    (0x115b2 <= code && code <= 0x115b5) || // Mn   [4] SIDDHAM VOWEL SIGN U..SIDDHAM VOWEL SIGN VOCALIC RR
    (0x115bc <= code && code <= 0x115bd) || // Mn   [2] SIDDHAM SIGN CANDRABINDU..SIDDHAM SIGN ANUSVARA
    (0x115bf <= code && code <= 0x115c0) || // Mn   [2] SIDDHAM SIGN VIRAMA..SIDDHAM SIGN NUKTA
    (0x115dc <= code && code <= 0x115dd) || // Mn   [2] SIDDHAM VOWEL SIGN ALTERNATE U..SIDDHAM VOWEL SIGN ALTERNATE UU
    (0x11633 <= code && code <= 0x1163a) || // Mn   [8] MODI VOWEL SIGN U..MODI VOWEL SIGN AI
    code == 0x1163d || // Mn       MODI SIGN ANUSVARA
    (0x1163f <= code && code <= 0x11640) || // Mn   [2] MODI SIGN VIRAMA..MODI SIGN ARDHACANDRA
    code == 0x116ab || // Mn       TAKRI SIGN ANUSVARA
    code == 0x116ad || // Mn       TAKRI VOWEL SIGN AA
    (0x116b0 <= code && code <= 0x116b5) || // Mn   [6] TAKRI VOWEL SIGN U..TAKRI VOWEL SIGN AU
    code == 0x116b7 || // Mn       TAKRI SIGN NUKTA
    (0x1171d <= code && code <= 0x1171f) || // Mn   [3] AHOM CONSONANT SIGN MEDIAL LA..AHOM CONSONANT SIGN MEDIAL LIGATING RA
    (0x11722 <= code && code <= 0x11725) || // Mn   [4] AHOM VOWEL SIGN I..AHOM VOWEL SIGN UU
    (0x11727 <= code && code <= 0x1172b) || // Mn   [5] AHOM VOWEL SIGN AW..AHOM SIGN KILLER
    (0x11a01 <= code && code <= 0x11a06) || // Mn   [6] ZANABAZAR SQUARE VOWEL SIGN I..ZANABAZAR SQUARE VOWEL SIGN O
    (0x11a09 <= code && code <= 0x11a0a) || // Mn   [2] ZANABAZAR SQUARE VOWEL SIGN REVERSED I..ZANABAZAR SQUARE VOWEL LENGTH MARK
    (0x11a33 <= code && code <= 0x11a38) || // Mn   [6] ZANABAZAR SQUARE FINAL CONSONANT MARK..ZANABAZAR SQUARE SIGN ANUSVARA
    (0x11a3b <= code && code <= 0x11a3e) || // Mn   [4] ZANABAZAR SQUARE CLUSTER-FINAL LETTER YA..ZANABAZAR SQUARE CLUSTER-FINAL LETTER VA
    code == 0x11a47 || // Mn       ZANABAZAR SQUARE SUBJOINER
    (0x11a51 <= code && code <= 0x11a56) || // Mn   [6] SOYOMBO VOWEL SIGN I..SOYOMBO VOWEL SIGN OE
    (0x11a59 <= code && code <= 0x11a5b) || // Mn   [3] SOYOMBO VOWEL SIGN VOCALIC R..SOYOMBO VOWEL LENGTH MARK
    (0x11a8a <= code && code <= 0x11a96) || // Mn  [13] SOYOMBO FINAL CONSONANT SIGN G..SOYOMBO SIGN ANUSVARA
    (0x11a98 <= code && code <= 0x11a99) || // Mn   [2] SOYOMBO GEMINATION MARK..SOYOMBO SUBJOINER
    (0x11c30 <= code && code <= 0x11c36) || // Mn   [7] BHAIKSUKI VOWEL SIGN I..BHAIKSUKI VOWEL SIGN VOCALIC L
    (0x11c38 <= code && code <= 0x11c3d) || // Mn   [6] BHAIKSUKI VOWEL SIGN E..BHAIKSUKI SIGN ANUSVARA
    code == 0x11c3f || // Mn       BHAIKSUKI SIGN VIRAMA
    (0x11c92 <= code && code <= 0x11ca7) || // Mn  [22] MARCHEN SUBJOINED LETTER KA..MARCHEN SUBJOINED LETTER ZA
    (0x11caa <= code && code <= 0x11cb0) || // Mn   [7] MARCHEN SUBJOINED LETTER RA..MARCHEN VOWEL SIGN AA
    (0x11cb2 <= code && code <= 0x11cb3) || // Mn   [2] MARCHEN VOWEL SIGN U..MARCHEN VOWEL SIGN E
    (0x11cb5 <= code && code <= 0x11cb6) || // Mn   [2] MARCHEN SIGN ANUSVARA..MARCHEN SIGN CANDRABINDU
    (0x11d31 <= code && code <= 0x11d36) || // Mn   [6] MASARAM GONDI VOWEL SIGN AA..MASARAM GONDI VOWEL SIGN VOCALIC R
    code == 0x11d3a || // Mn       MASARAM GONDI VOWEL SIGN E
    (0x11d3c <= code && code <= 0x11d3d) || // Mn   [2] MASARAM GONDI VOWEL SIGN AI..MASARAM GONDI VOWEL SIGN O
    (0x11d3f <= code && code <= 0x11d45) || // Mn   [7] MASARAM GONDI VOWEL SIGN AU..MASARAM GONDI VIRAMA
    code == 0x11d47 || // Mn       MASARAM GONDI RA-KARA
    (0x16af0 <= code && code <= 0x16af4) || // Mn   [5] BASSA VAH COMBINING HIGH TONE..BASSA VAH COMBINING HIGH-LOW TONE
    (0x16b30 <= code && code <= 0x16b36) || // Mn   [7] PAHAWH HMONG MARK CIM TUB..PAHAWH HMONG MARK CIM TAUM
    (0x16f8f <= code && code <= 0x16f92) || // Mn   [4] MIAO TONE RIGHT..MIAO TONE BELOW
    (0x1bc9d <= code && code <= 0x1bc9e) || // Mn   [2] DUPLOYAN THICK LETTER SELECTOR..DUPLOYAN DOUBLE MARK
    code == 0x1d165 || // Mc       MUSICAL SYMBOL COMBINING STEM
    (0x1d167 <= code && code <= 0x1d169) || // Mn   [3] MUSICAL SYMBOL COMBINING TREMOLO-1..MUSICAL SYMBOL COMBINING TREMOLO-3
    (0x1d16e <= code && code <= 0x1d172) || // Mc   [5] MUSICAL SYMBOL COMBINING FLAG-1..MUSICAL SYMBOL COMBINING FLAG-5
    (0x1d17b <= code && code <= 0x1d182) || // Mn   [8] MUSICAL SYMBOL COMBINING ACCENT..MUSICAL SYMBOL COMBINING LOURE
    (0x1d185 <= code && code <= 0x1d18b) || // Mn   [7] MUSICAL SYMBOL COMBINING DOIT..MUSICAL SYMBOL COMBINING TRIPLE TONGUE
    (0x1d1aa <= code && code <= 0x1d1ad) || // Mn   [4] MUSICAL SYMBOL COMBINING DOWN BOW..MUSICAL SYMBOL COMBINING SNAP PIZZICATO
    (0x1d242 <= code && code <= 0x1d244) || // Mn   [3] COMBINING GREEK MUSICAL TRISEME..COMBINING GREEK MUSICAL PENTASEME
    (0x1da00 <= code && code <= 0x1da36) || // Mn  [55] SIGNWRITING HEAD RIM..SIGNWRITING AIR SUCKING IN
    (0x1da3b <= code && code <= 0x1da6c) || // Mn  [50] SIGNWRITING MOUTH CLOSED NEUTRAL..SIGNWRITING EXCITEMENT
    code == 0x1da75 || // Mn       SIGNWRITING UPPER BODY TILTING FROM HIP JOINTS
    code == 0x1da84 || // Mn       SIGNWRITING LOCATION HEAD NECK
    (0x1da9b <= code && code <= 0x1da9f) || // Mn   [5] SIGNWRITING FILL MODIFIER-2..SIGNWRITING FILL MODIFIER-6
    (0x1daa1 <= code && code <= 0x1daaf) || // Mn  [15] SIGNWRITING ROTATION MODIFIER-2..SIGNWRITING ROTATION MODIFIER-16
    (0x1e000 <= code && code <= 0x1e006) || // Mn   [7] COMBINING GLAGOLITIC LETTER AZU..COMBINING GLAGOLITIC LETTER ZHIVETE
    (0x1e008 <= code && code <= 0x1e018) || // Mn  [17] COMBINING GLAGOLITIC LETTER ZEMLJA..COMBINING GLAGOLITIC LETTER HERU
    (0x1e01b <= code && code <= 0x1e021) || // Mn   [7] COMBINING GLAGOLITIC LETTER SHTA..COMBINING GLAGOLITIC LETTER YATI
    (0x1e023 <= code && code <= 0x1e024) || // Mn   [2] COMBINING GLAGOLITIC LETTER YU..COMBINING GLAGOLITIC LETTER SMALL YUS
    (0x1e026 <= code && code <= 0x1e02a) || // Mn   [5] COMBINING GLAGOLITIC LETTER YO..COMBINING GLAGOLITIC LETTER FITA
    (0x1e8d0 <= code && code <= 0x1e8d6) || // Mn   [7] MENDE KIKAKUI COMBINING NUMBER TEENS..MENDE KIKAKUI COMBINING NUMBER MILLIONS
    (0x1e944 <= code && code <= 0x1e94a) || // Mn   [7] ADLAM ALIF LENGTHENER..ADLAM NUKTA
    (0xe0020 <= code && code <= 0xe007f) || // Cf  [96] TAG SPACE..CANCEL TAG
    (0xe0100 <= code && code <= 0xe01ef) // Mn [240] VARIATION SELECTOR-17..VARIATION SELECTOR-256
  ) {
    return Extend
  }

  if (
    0x1f1e6 <= code &&
    code <= 0x1f1ff // So  [26] REGIONAL INDICATOR SYMBOL LETTER A..REGIONAL INDICATOR SYMBOL LETTER Z
  ) {
    return RegionalIndicator
  }

  if (
    code == 0x0903 || // Mc       DEVANAGARI SIGN VISARGA
    code == 0x093b || // Mc       DEVANAGARI VOWEL SIGN OOE
    (0x093e <= code && code <= 0x0940) || // Mc   [3] DEVANAGARI VOWEL SIGN AA..DEVANAGARI VOWEL SIGN II
    (0x0949 <= code && code <= 0x094c) || // Mc   [4] DEVANAGARI VOWEL SIGN CANDRA O..DEVANAGARI VOWEL SIGN AU
    (0x094e <= code && code <= 0x094f) || // Mc   [2] DEVANAGARI VOWEL SIGN PRISHTHAMATRA E..DEVANAGARI VOWEL SIGN AW
    (0x0982 <= code && code <= 0x0983) || // Mc   [2] BENGALI SIGN ANUSVARA..BENGALI SIGN VISARGA
    (0x09bf <= code && code <= 0x09c0) || // Mc   [2] BENGALI VOWEL SIGN I..BENGALI VOWEL SIGN II
    (0x09c7 <= code && code <= 0x09c8) || // Mc   [2] BENGALI VOWEL SIGN E..BENGALI VOWEL SIGN AI
    (0x09cb <= code && code <= 0x09cc) || // Mc   [2] BENGALI VOWEL SIGN O..BENGALI VOWEL SIGN AU
    code == 0x0a03 || // Mc       GURMUKHI SIGN VISARGA
    (0x0a3e <= code && code <= 0x0a40) || // Mc   [3] GURMUKHI VOWEL SIGN AA..GURMUKHI VOWEL SIGN II
    code == 0x0a83 || // Mc       GUJARATI SIGN VISARGA
    (0x0abe <= code && code <= 0x0ac0) || // Mc   [3] GUJARATI VOWEL SIGN AA..GUJARATI VOWEL SIGN II
    code == 0x0ac9 || // Mc       GUJARATI VOWEL SIGN CANDRA O
    (0x0acb <= code && code <= 0x0acc) || // Mc   [2] GUJARATI VOWEL SIGN O..GUJARATI VOWEL SIGN AU
    (0x0b02 <= code && code <= 0x0b03) || // Mc   [2] ORIYA SIGN ANUSVARA..ORIYA SIGN VISARGA
    code == 0x0b40 || // Mc       ORIYA VOWEL SIGN II
    (0x0b47 <= code && code <= 0x0b48) || // Mc   [2] ORIYA VOWEL SIGN E..ORIYA VOWEL SIGN AI
    (0x0b4b <= code && code <= 0x0b4c) || // Mc   [2] ORIYA VOWEL SIGN O..ORIYA VOWEL SIGN AU
    code == 0x0bbf || // Mc       TAMIL VOWEL SIGN I
    (0x0bc1 <= code && code <= 0x0bc2) || // Mc   [2] TAMIL VOWEL SIGN U..TAMIL VOWEL SIGN UU
    (0x0bc6 <= code && code <= 0x0bc8) || // Mc   [3] TAMIL VOWEL SIGN E..TAMIL VOWEL SIGN AI
    (0x0bca <= code && code <= 0x0bcc) || // Mc   [3] TAMIL VOWEL SIGN O..TAMIL VOWEL SIGN AU
    (0x0c01 <= code && code <= 0x0c03) || // Mc   [3] TELUGU SIGN CANDRABINDU..TELUGU SIGN VISARGA
    (0x0c41 <= code && code <= 0x0c44) || // Mc   [4] TELUGU VOWEL SIGN U..TELUGU VOWEL SIGN VOCALIC RR
    (0x0c82 <= code && code <= 0x0c83) || // Mc   [2] KANNADA SIGN ANUSVARA..KANNADA SIGN VISARGA
    code == 0x0cbe || // Mc       KANNADA VOWEL SIGN AA
    (0x0cc0 <= code && code <= 0x0cc1) || // Mc   [2] KANNADA VOWEL SIGN II..KANNADA VOWEL SIGN U
    (0x0cc3 <= code && code <= 0x0cc4) || // Mc   [2] KANNADA VOWEL SIGN VOCALIC R..KANNADA VOWEL SIGN VOCALIC RR
    (0x0cc7 <= code && code <= 0x0cc8) || // Mc   [2] KANNADA VOWEL SIGN EE..KANNADA VOWEL SIGN AI
    (0x0cca <= code && code <= 0x0ccb) || // Mc   [2] KANNADA VOWEL SIGN O..KANNADA VOWEL SIGN OO
    (0x0d02 <= code && code <= 0x0d03) || // Mc   [2] MALAYALAM SIGN ANUSVARA..MALAYALAM SIGN VISARGA
    (0x0d3f <= code && code <= 0x0d40) || // Mc   [2] MALAYALAM VOWEL SIGN I..MALAYALAM VOWEL SIGN II
    (0x0d46 <= code && code <= 0x0d48) || // Mc   [3] MALAYALAM VOWEL SIGN E..MALAYALAM VOWEL SIGN AI
    (0x0d4a <= code && code <= 0x0d4c) || // Mc   [3] MALAYALAM VOWEL SIGN O..MALAYALAM VOWEL SIGN AU
    (0x0d82 <= code && code <= 0x0d83) || // Mc   [2] SINHALA SIGN ANUSVARAYA..SINHALA SIGN VISARGAYA
    (0x0dd0 <= code && code <= 0x0dd1) || // Mc   [2] SINHALA VOWEL SIGN KETTI AEDA-PILLA..SINHALA VOWEL SIGN DIGA AEDA-PILLA
    (0x0dd8 <= code && code <= 0x0dde) || // Mc   [7] SINHALA VOWEL SIGN GAETTA-PILLA..SINHALA VOWEL SIGN KOMBUVA HAA GAYANUKITTA
    (0x0df2 <= code && code <= 0x0df3) || // Mc   [2] SINHALA VOWEL SIGN DIGA GAETTA-PILLA..SINHALA VOWEL SIGN DIGA GAYANUKITTA
    code == 0x0e33 || // Lo       THAI CHARACTER SARA AM
    code == 0x0eb3 || // Lo       LAO VOWEL SIGN AM
    (0x0f3e <= code && code <= 0x0f3f) || // Mc   [2] TIBETAN SIGN YAR TSHES..TIBETAN SIGN MAR TSHES
    code == 0x0f7f || // Mc       TIBETAN SIGN RNAM BCAD
    code == 0x1031 || // Mc       MYANMAR VOWEL SIGN E
    (0x103b <= code && code <= 0x103c) || // Mc   [2] MYANMAR CONSONANT SIGN MEDIAL YA..MYANMAR CONSONANT SIGN MEDIAL RA
    (0x1056 <= code && code <= 0x1057) || // Mc   [2] MYANMAR VOWEL SIGN VOCALIC R..MYANMAR VOWEL SIGN VOCALIC RR
    code == 0x1084 || // Mc       MYANMAR VOWEL SIGN SHAN E
    code == 0x17b6 || // Mc       KHMER VOWEL SIGN AA
    (0x17be <= code && code <= 0x17c5) || // Mc   [8] KHMER VOWEL SIGN OE..KHMER VOWEL SIGN AU
    (0x17c7 <= code && code <= 0x17c8) || // Mc   [2] KHMER SIGN REAHMUK..KHMER SIGN YUUKALEAPINTU
    (0x1923 <= code && code <= 0x1926) || // Mc   [4] LIMBU VOWEL SIGN EE..LIMBU VOWEL SIGN AU
    (0x1929 <= code && code <= 0x192b) || // Mc   [3] LIMBU SUBJOINED LETTER YA..LIMBU SUBJOINED LETTER WA
    (0x1930 <= code && code <= 0x1931) || // Mc   [2] LIMBU SMALL LETTER KA..LIMBU SMALL LETTER NGA
    (0x1933 <= code && code <= 0x1938) || // Mc   [6] LIMBU SMALL LETTER TA..LIMBU SMALL LETTER LA
    (0x1a19 <= code && code <= 0x1a1a) || // Mc   [2] BUGINESE VOWEL SIGN E..BUGINESE VOWEL SIGN O
    code == 0x1a55 || // Mc       TAI THAM CONSONANT SIGN MEDIAL RA
    code == 0x1a57 || // Mc       TAI THAM CONSONANT SIGN LA TANG LAI
    (0x1a6d <= code && code <= 0x1a72) || // Mc   [6] TAI THAM VOWEL SIGN OY..TAI THAM VOWEL SIGN THAM AI
    code == 0x1b04 || // Mc       BALINESE SIGN BISAH
    code == 0x1b35 || // Mc       BALINESE VOWEL SIGN TEDUNG
    code == 0x1b3b || // Mc       BALINESE VOWEL SIGN RA REPA TEDUNG
    (0x1b3d <= code && code <= 0x1b41) || // Mc   [5] BALINESE VOWEL SIGN LA LENGA TEDUNG..BALINESE VOWEL SIGN TALING REPA TEDUNG
    (0x1b43 <= code && code <= 0x1b44) || // Mc   [2] BALINESE VOWEL SIGN PEPET TEDUNG..BALINESE ADEG ADEG
    code == 0x1b82 || // Mc       SUNDANESE SIGN PANGWISAD
    code == 0x1ba1 || // Mc       SUNDANESE CONSONANT SIGN PAMINGKAL
    (0x1ba6 <= code && code <= 0x1ba7) || // Mc   [2] SUNDANESE VOWEL SIGN PANAELAENG..SUNDANESE VOWEL SIGN PANOLONG
    code == 0x1baa || // Mc       SUNDANESE SIGN PAMAAEH
    code == 0x1be7 || // Mc       BATAK VOWEL SIGN E
    (0x1bea <= code && code <= 0x1bec) || // Mc   [3] BATAK VOWEL SIGN I..BATAK VOWEL SIGN O
    code == 0x1bee || // Mc       BATAK VOWEL SIGN U
    (0x1bf2 <= code && code <= 0x1bf3) || // Mc   [2] BATAK PANGOLAT..BATAK PANONGONAN
    (0x1c24 <= code && code <= 0x1c2b) || // Mc   [8] LEPCHA SUBJOINED LETTER YA..LEPCHA VOWEL SIGN UU
    (0x1c34 <= code && code <= 0x1c35) || // Mc   [2] LEPCHA CONSONANT SIGN NYIN-DO..LEPCHA CONSONANT SIGN KANG
    code == 0x1ce1 || // Mc       VEDIC TONE ATHARVAVEDIC INDEPENDENT SVARITA
    (0x1cf2 <= code && code <= 0x1cf3) || // Mc   [2] VEDIC SIGN ARDHAVISARGA..VEDIC SIGN ROTATED ARDHAVISARGA
    code == 0x1cf7 || // Mc       VEDIC SIGN ATIKRAMA
    (0xa823 <= code && code <= 0xa824) || // Mc   [2] SYLOTI NAGRI VOWEL SIGN A..SYLOTI NAGRI VOWEL SIGN I
    code == 0xa827 || // Mc       SYLOTI NAGRI VOWEL SIGN OO
    (0xa880 <= code && code <= 0xa881) || // Mc   [2] SAURASHTRA SIGN ANUSVARA..SAURASHTRA SIGN VISARGA
    (0xa8b4 <= code && code <= 0xa8c3) || // Mc  [16] SAURASHTRA CONSONANT SIGN HAARU..SAURASHTRA VOWEL SIGN AU
    (0xa952 <= code && code <= 0xa953) || // Mc   [2] REJANG CONSONANT SIGN H..REJANG VIRAMA
    code == 0xa983 || // Mc       JAVANESE SIGN WIGNYAN
    (0xa9b4 <= code && code <= 0xa9b5) || // Mc   [2] JAVANESE VOWEL SIGN TARUNG..JAVANESE VOWEL SIGN TOLONG
    (0xa9ba <= code && code <= 0xa9bb) || // Mc   [2] JAVANESE VOWEL SIGN TALING..JAVANESE VOWEL SIGN DIRGA MURE
    (0xa9bd <= code && code <= 0xa9c0) || // Mc   [4] JAVANESE CONSONANT SIGN KERET..JAVANESE PANGKON
    (0xaa2f <= code && code <= 0xaa30) || // Mc   [2] CHAM VOWEL SIGN O..CHAM VOWEL SIGN AI
    (0xaa33 <= code && code <= 0xaa34) || // Mc   [2] CHAM CONSONANT SIGN YA..CHAM CONSONANT SIGN RA
    code == 0xaa4d || // Mc       CHAM CONSONANT SIGN FINAL H
    code == 0xaaeb || // Mc       MEETEI MAYEK VOWEL SIGN II
    (0xaaee <= code && code <= 0xaaef) || // Mc   [2] MEETEI MAYEK VOWEL SIGN AU..MEETEI MAYEK VOWEL SIGN AAU
    code == 0xaaf5 || // Mc       MEETEI MAYEK VOWEL SIGN VISARGA
    (0xabe3 <= code && code <= 0xabe4) || // Mc   [2] MEETEI MAYEK VOWEL SIGN ONAP..MEETEI MAYEK VOWEL SIGN INAP
    (0xabe6 <= code && code <= 0xabe7) || // Mc   [2] MEETEI MAYEK VOWEL SIGN YENAP..MEETEI MAYEK VOWEL SIGN SOUNAP
    (0xabe9 <= code && code <= 0xabea) || // Mc   [2] MEETEI MAYEK VOWEL SIGN CHEINAP..MEETEI MAYEK VOWEL SIGN NUNG
    code == 0xabec || // Mc       MEETEI MAYEK LUM IYEK
    code == 0x11000 || // Mc       BRAHMI SIGN CANDRABINDU
    code == 0x11002 || // Mc       BRAHMI SIGN VISARGA
    code == 0x11082 || // Mc       KAITHI SIGN VISARGA
    (0x110b0 <= code && code <= 0x110b2) || // Mc   [3] KAITHI VOWEL SIGN AA..KAITHI VOWEL SIGN II
    (0x110b7 <= code && code <= 0x110b8) || // Mc   [2] KAITHI VOWEL SIGN O..KAITHI VOWEL SIGN AU
    code == 0x1112c || // Mc       CHAKMA VOWEL SIGN E
    code == 0x11182 || // Mc       SHARADA SIGN VISARGA
    (0x111b3 <= code && code <= 0x111b5) || // Mc   [3] SHARADA VOWEL SIGN AA..SHARADA VOWEL SIGN II
    (0x111bf <= code && code <= 0x111c0) || // Mc   [2] SHARADA VOWEL SIGN AU..SHARADA SIGN VIRAMA
    (0x1122c <= code && code <= 0x1122e) || // Mc   [3] KHOJKI VOWEL SIGN AA..KHOJKI VOWEL SIGN II
    (0x11232 <= code && code <= 0x11233) || // Mc   [2] KHOJKI VOWEL SIGN O..KHOJKI VOWEL SIGN AU
    code == 0x11235 || // Mc       KHOJKI SIGN VIRAMA
    (0x112e0 <= code && code <= 0x112e2) || // Mc   [3] KHUDAWADI VOWEL SIGN AA..KHUDAWADI VOWEL SIGN II
    (0x11302 <= code && code <= 0x11303) || // Mc   [2] GRANTHA SIGN ANUSVARA..GRANTHA SIGN VISARGA
    code == 0x1133f || // Mc       GRANTHA VOWEL SIGN I
    (0x11341 <= code && code <= 0x11344) || // Mc   [4] GRANTHA VOWEL SIGN U..GRANTHA VOWEL SIGN VOCALIC RR
    (0x11347 <= code && code <= 0x11348) || // Mc   [2] GRANTHA VOWEL SIGN EE..GRANTHA VOWEL SIGN AI
    (0x1134b <= code && code <= 0x1134d) || // Mc   [3] GRANTHA VOWEL SIGN OO..GRANTHA SIGN VIRAMA
    (0x11362 <= code && code <= 0x11363) || // Mc   [2] GRANTHA VOWEL SIGN VOCALIC L..GRANTHA VOWEL SIGN VOCALIC LL
    (0x11435 <= code && code <= 0x11437) || // Mc   [3] NEWA VOWEL SIGN AA..NEWA VOWEL SIGN II
    (0x11440 <= code && code <= 0x11441) || // Mc   [2] NEWA VOWEL SIGN O..NEWA VOWEL SIGN AU
    code == 0x11445 || // Mc       NEWA SIGN VISARGA
    (0x114b1 <= code && code <= 0x114b2) || // Mc   [2] TIRHUTA VOWEL SIGN I..TIRHUTA VOWEL SIGN II
    code == 0x114b9 || // Mc       TIRHUTA VOWEL SIGN E
    (0x114bb <= code && code <= 0x114bc) || // Mc   [2] TIRHUTA VOWEL SIGN AI..TIRHUTA VOWEL SIGN O
    code == 0x114be || // Mc       TIRHUTA VOWEL SIGN AU
    code == 0x114c1 || // Mc       TIRHUTA SIGN VISARGA
    (0x115b0 <= code && code <= 0x115b1) || // Mc   [2] SIDDHAM VOWEL SIGN I..SIDDHAM VOWEL SIGN II
    (0x115b8 <= code && code <= 0x115bb) || // Mc   [4] SIDDHAM VOWEL SIGN E..SIDDHAM VOWEL SIGN AU
    code == 0x115be || // Mc       SIDDHAM SIGN VISARGA
    (0x11630 <= code && code <= 0x11632) || // Mc   [3] MODI VOWEL SIGN AA..MODI VOWEL SIGN II
    (0x1163b <= code && code <= 0x1163c) || // Mc   [2] MODI VOWEL SIGN O..MODI VOWEL SIGN AU
    code == 0x1163e || // Mc       MODI SIGN VISARGA
    code == 0x116ac || // Mc       TAKRI SIGN VISARGA
    (0x116ae <= code && code <= 0x116af) || // Mc   [2] TAKRI VOWEL SIGN I..TAKRI VOWEL SIGN II
    code == 0x116b6 || // Mc       TAKRI SIGN VIRAMA
    (0x11720 <= code && code <= 0x11721) || // Mc   [2] AHOM VOWEL SIGN A..AHOM VOWEL SIGN AA
    code == 0x11726 || // Mc       AHOM VOWEL SIGN E
    (0x11a07 <= code && code <= 0x11a08) || // Mc   [2] ZANABAZAR SQUARE VOWEL SIGN AI..ZANABAZAR SQUARE VOWEL SIGN AU
    code == 0x11a39 || // Mc       ZANABAZAR SQUARE SIGN VISARGA
    (0x11a57 <= code && code <= 0x11a58) || // Mc   [2] SOYOMBO VOWEL SIGN AI..SOYOMBO VOWEL SIGN AU
    code == 0x11a97 || // Mc       SOYOMBO SIGN VISARGA
    code == 0x11c2f || // Mc       BHAIKSUKI VOWEL SIGN AA
    code == 0x11c3e || // Mc       BHAIKSUKI SIGN VISARGA
    code == 0x11ca9 || // Mc       MARCHEN SUBJOINED LETTER YA
    code == 0x11cb1 || // Mc       MARCHEN VOWEL SIGN I
    code == 0x11cb4 || // Mc       MARCHEN VOWEL SIGN O
    (0x16f51 <= code && code <= 0x16f7e) || // Mc  [46] MIAO SIGN ASPIRATION..MIAO VOWEL SIGN NG
    code == 0x1d166 || // Mc       MUSICAL SYMBOL COMBINING SPRECHGESANG STEM
    code == 0x1d16d // Mc       MUSICAL SYMBOL COMBINING AUGMENTATION DOT
  ) {
    return SpacingMark
  }

  if (
    (0x1100 <= code && code <= 0x115f) || // Lo  [96] HANGUL CHOSEONG KIYEOK..HANGUL CHOSEONG FILLER
    (0xa960 <= code && code <= 0xa97c) // Lo  [29] HANGUL CHOSEONG TIKEUT-MIEUM..HANGUL CHOSEONG SSANGYEORINHIEUH
  ) {
    return L
  }

  if (
    (0x1160 <= code && code <= 0x11a7) || // Lo  [72] HANGUL JUNGSEONG FILLER..HANGUL JUNGSEONG O-YAE
    (0xd7b0 <= code && code <= 0xd7c6) // Lo  [23] HANGUL JUNGSEONG O-YEO..HANGUL JUNGSEONG ARAEA-E
  ) {
    return V
  }

  if (
    (0x11a8 <= code && code <= 0x11ff) || // Lo  [88] HANGUL JONGSEONG KIYEOK..HANGUL JONGSEONG SSANGNIEUN
    (0xd7cb <= code && code <= 0xd7fb) // Lo  [49] HANGUL JONGSEONG NIEUN-RIEUL..HANGUL JONGSEONG PHIEUPH-THIEUTH
  ) {
    return T
  }

  if (
    code == 0xac00 || // Lo       HANGUL SYLLABLE GA
    code == 0xac1c || // Lo       HANGUL SYLLABLE GAE
    code == 0xac38 || // Lo       HANGUL SYLLABLE GYA
    code == 0xac54 || // Lo       HANGUL SYLLABLE GYAE
    code == 0xac70 || // Lo       HANGUL SYLLABLE GEO
    code == 0xac8c || // Lo       HANGUL SYLLABLE GE
    code == 0xaca8 || // Lo       HANGUL SYLLABLE GYEO
    code == 0xacc4 || // Lo       HANGUL SYLLABLE GYE
    code == 0xace0 || // Lo       HANGUL SYLLABLE GO
    code == 0xacfc || // Lo       HANGUL SYLLABLE GWA
    code == 0xad18 || // Lo       HANGUL SYLLABLE GWAE
    code == 0xad34 || // Lo       HANGUL SYLLABLE GOE
    code == 0xad50 || // Lo       HANGUL SYLLABLE GYO
    code == 0xad6c || // Lo       HANGUL SYLLABLE GU
    code == 0xad88 || // Lo       HANGUL SYLLABLE GWEO
    code == 0xada4 || // Lo       HANGUL SYLLABLE GWE
    code == 0xadc0 || // Lo       HANGUL SYLLABLE GWI
    code == 0xaddc || // Lo       HANGUL SYLLABLE GYU
    code == 0xadf8 || // Lo       HANGUL SYLLABLE GEU
    code == 0xae14 || // Lo       HANGUL SYLLABLE GYI
    code == 0xae30 || // Lo       HANGUL SYLLABLE GI
    code == 0xae4c || // Lo       HANGUL SYLLABLE GGA
    code == 0xae68 || // Lo       HANGUL SYLLABLE GGAE
    code == 0xae84 || // Lo       HANGUL SYLLABLE GGYA
    code == 0xaea0 || // Lo       HANGUL SYLLABLE GGYAE
    code == 0xaebc || // Lo       HANGUL SYLLABLE GGEO
    code == 0xaed8 || // Lo       HANGUL SYLLABLE GGE
    code == 0xaef4 || // Lo       HANGUL SYLLABLE GGYEO
    code == 0xaf10 || // Lo       HANGUL SYLLABLE GGYE
    code == 0xaf2c || // Lo       HANGUL SYLLABLE GGO
    code == 0xaf48 || // Lo       HANGUL SYLLABLE GGWA
    code == 0xaf64 || // Lo       HANGUL SYLLABLE GGWAE
    code == 0xaf80 || // Lo       HANGUL SYLLABLE GGOE
    code == 0xaf9c || // Lo       HANGUL SYLLABLE GGYO
    code == 0xafb8 || // Lo       HANGUL SYLLABLE GGU
    code == 0xafd4 || // Lo       HANGUL SYLLABLE GGWEO
    code == 0xaff0 || // Lo       HANGUL SYLLABLE GGWE
    code == 0xb00c || // Lo       HANGUL SYLLABLE GGWI
    code == 0xb028 || // Lo       HANGUL SYLLABLE GGYU
    code == 0xb044 || // Lo       HANGUL SYLLABLE GGEU
    code == 0xb060 || // Lo       HANGUL SYLLABLE GGYI
    code == 0xb07c || // Lo       HANGUL SYLLABLE GGI
    code == 0xb098 || // Lo       HANGUL SYLLABLE NA
    code == 0xb0b4 || // Lo       HANGUL SYLLABLE NAE
    code == 0xb0d0 || // Lo       HANGUL SYLLABLE NYA
    code == 0xb0ec || // Lo       HANGUL SYLLABLE NYAE
    code == 0xb108 || // Lo       HANGUL SYLLABLE NEO
    code == 0xb124 || // Lo       HANGUL SYLLABLE NE
    code == 0xb140 || // Lo       HANGUL SYLLABLE NYEO
    code == 0xb15c || // Lo       HANGUL SYLLABLE NYE
    code == 0xb178 || // Lo       HANGUL SYLLABLE NO
    code == 0xb194 || // Lo       HANGUL SYLLABLE NWA
    code == 0xb1b0 || // Lo       HANGUL SYLLABLE NWAE
    code == 0xb1cc || // Lo       HANGUL SYLLABLE NOE
    code == 0xb1e8 || // Lo       HANGUL SYLLABLE NYO
    code == 0xb204 || // Lo       HANGUL SYLLABLE NU
    code == 0xb220 || // Lo       HANGUL SYLLABLE NWEO
    code == 0xb23c || // Lo       HANGUL SYLLABLE NWE
    code == 0xb258 || // Lo       HANGUL SYLLABLE NWI
    code == 0xb274 || // Lo       HANGUL SYLLABLE NYU
    code == 0xb290 || // Lo       HANGUL SYLLABLE NEU
    code == 0xb2ac || // Lo       HANGUL SYLLABLE NYI
    code == 0xb2c8 || // Lo       HANGUL SYLLABLE NI
    code == 0xb2e4 || // Lo       HANGUL SYLLABLE DA
    code == 0xb300 || // Lo       HANGUL SYLLABLE DAE
    code == 0xb31c || // Lo       HANGUL SYLLABLE DYA
    code == 0xb338 || // Lo       HANGUL SYLLABLE DYAE
    code == 0xb354 || // Lo       HANGUL SYLLABLE DEO
    code == 0xb370 || // Lo       HANGUL SYLLABLE DE
    code == 0xb38c || // Lo       HANGUL SYLLABLE DYEO
    code == 0xb3a8 || // Lo       HANGUL SYLLABLE DYE
    code == 0xb3c4 || // Lo       HANGUL SYLLABLE DO
    code == 0xb3e0 || // Lo       HANGUL SYLLABLE DWA
    code == 0xb3fc || // Lo       HANGUL SYLLABLE DWAE
    code == 0xb418 || // Lo       HANGUL SYLLABLE DOE
    code == 0xb434 || // Lo       HANGUL SYLLABLE DYO
    code == 0xb450 || // Lo       HANGUL SYLLABLE DU
    code == 0xb46c || // Lo       HANGUL SYLLABLE DWEO
    code == 0xb488 || // Lo       HANGUL SYLLABLE DWE
    code == 0xb4a4 || // Lo       HANGUL SYLLABLE DWI
    code == 0xb4c0 || // Lo       HANGUL SYLLABLE DYU
    code == 0xb4dc || // Lo       HANGUL SYLLABLE DEU
    code == 0xb4f8 || // Lo       HANGUL SYLLABLE DYI
    code == 0xb514 || // Lo       HANGUL SYLLABLE DI
    code == 0xb530 || // Lo       HANGUL SYLLABLE DDA
    code == 0xb54c || // Lo       HANGUL SYLLABLE DDAE
    code == 0xb568 || // Lo       HANGUL SYLLABLE DDYA
    code == 0xb584 || // Lo       HANGUL SYLLABLE DDYAE
    code == 0xb5a0 || // Lo       HANGUL SYLLABLE DDEO
    code == 0xb5bc || // Lo       HANGUL SYLLABLE DDE
    code == 0xb5d8 || // Lo       HANGUL SYLLABLE DDYEO
    code == 0xb5f4 || // Lo       HANGUL SYLLABLE DDYE
    code == 0xb610 || // Lo       HANGUL SYLLABLE DDO
    code == 0xb62c || // Lo       HANGUL SYLLABLE DDWA
    code == 0xb648 || // Lo       HANGUL SYLLABLE DDWAE
    code == 0xb664 || // Lo       HANGUL SYLLABLE DDOE
    code == 0xb680 || // Lo       HANGUL SYLLABLE DDYO
    code == 0xb69c || // Lo       HANGUL SYLLABLE DDU
    code == 0xb6b8 || // Lo       HANGUL SYLLABLE DDWEO
    code == 0xb6d4 || // Lo       HANGUL SYLLABLE DDWE
    code == 0xb6f0 || // Lo       HANGUL SYLLABLE DDWI
    code == 0xb70c || // Lo       HANGUL SYLLABLE DDYU
    code == 0xb728 || // Lo       HANGUL SYLLABLE DDEU
    code == 0xb744 || // Lo       HANGUL SYLLABLE DDYI
    code == 0xb760 || // Lo       HANGUL SYLLABLE DDI
    code == 0xb77c || // Lo       HANGUL SYLLABLE RA
    code == 0xb798 || // Lo       HANGUL SYLLABLE RAE
    code == 0xb7b4 || // Lo       HANGUL SYLLABLE RYA
    code == 0xb7d0 || // Lo       HANGUL SYLLABLE RYAE
    code == 0xb7ec || // Lo       HANGUL SYLLABLE REO
    code == 0xb808 || // Lo       HANGUL SYLLABLE RE
    code == 0xb824 || // Lo       HANGUL SYLLABLE RYEO
    code == 0xb840 || // Lo       HANGUL SYLLABLE RYE
    code == 0xb85c || // Lo       HANGUL SYLLABLE RO
    code == 0xb878 || // Lo       HANGUL SYLLABLE RWA
    code == 0xb894 || // Lo       HANGUL SYLLABLE RWAE
    code == 0xb8b0 || // Lo       HANGUL SYLLABLE ROE
    code == 0xb8cc || // Lo       HANGUL SYLLABLE RYO
    code == 0xb8e8 || // Lo       HANGUL SYLLABLE RU
    code == 0xb904 || // Lo       HANGUL SYLLABLE RWEO
    code == 0xb920 || // Lo       HANGUL SYLLABLE RWE
    code == 0xb93c || // Lo       HANGUL SYLLABLE RWI
    code == 0xb958 || // Lo       HANGUL SYLLABLE RYU
    code == 0xb974 || // Lo       HANGUL SYLLABLE REU
    code == 0xb990 || // Lo       HANGUL SYLLABLE RYI
    code == 0xb9ac || // Lo       HANGUL SYLLABLE RI
    code == 0xb9c8 || // Lo       HANGUL SYLLABLE MA
    code == 0xb9e4 || // Lo       HANGUL SYLLABLE MAE
    code == 0xba00 || // Lo       HANGUL SYLLABLE MYA
    code == 0xba1c || // Lo       HANGUL SYLLABLE MYAE
    code == 0xba38 || // Lo       HANGUL SYLLABLE MEO
    code == 0xba54 || // Lo       HANGUL SYLLABLE ME
    code == 0xba70 || // Lo       HANGUL SYLLABLE MYEO
    code == 0xba8c || // Lo       HANGUL SYLLABLE MYE
    code == 0xbaa8 || // Lo       HANGUL SYLLABLE MO
    code == 0xbac4 || // Lo       HANGUL SYLLABLE MWA
    code == 0xbae0 || // Lo       HANGUL SYLLABLE MWAE
    code == 0xbafc || // Lo       HANGUL SYLLABLE MOE
    code == 0xbb18 || // Lo       HANGUL SYLLABLE MYO
    code == 0xbb34 || // Lo       HANGUL SYLLABLE MU
    code == 0xbb50 || // Lo       HANGUL SYLLABLE MWEO
    code == 0xbb6c || // Lo       HANGUL SYLLABLE MWE
    code == 0xbb88 || // Lo       HANGUL SYLLABLE MWI
    code == 0xbba4 || // Lo       HANGUL SYLLABLE MYU
    code == 0xbbc0 || // Lo       HANGUL SYLLABLE MEU
    code == 0xbbdc || // Lo       HANGUL SYLLABLE MYI
    code == 0xbbf8 || // Lo       HANGUL SYLLABLE MI
    code == 0xbc14 || // Lo       HANGUL SYLLABLE BA
    code == 0xbc30 || // Lo       HANGUL SYLLABLE BAE
    code == 0xbc4c || // Lo       HANGUL SYLLABLE BYA
    code == 0xbc68 || // Lo       HANGUL SYLLABLE BYAE
    code == 0xbc84 || // Lo       HANGUL SYLLABLE BEO
    code == 0xbca0 || // Lo       HANGUL SYLLABLE BE
    code == 0xbcbc || // Lo       HANGUL SYLLABLE BYEO
    code == 0xbcd8 || // Lo       HANGUL SYLLABLE BYE
    code == 0xbcf4 || // Lo       HANGUL SYLLABLE BO
    code == 0xbd10 || // Lo       HANGUL SYLLABLE BWA
    code == 0xbd2c || // Lo       HANGUL SYLLABLE BWAE
    code == 0xbd48 || // Lo       HANGUL SYLLABLE BOE
    code == 0xbd64 || // Lo       HANGUL SYLLABLE BYO
    code == 0xbd80 || // Lo       HANGUL SYLLABLE BU
    code == 0xbd9c || // Lo       HANGUL SYLLABLE BWEO
    code == 0xbdb8 || // Lo       HANGUL SYLLABLE BWE
    code == 0xbdd4 || // Lo       HANGUL SYLLABLE BWI
    code == 0xbdf0 || // Lo       HANGUL SYLLABLE BYU
    code == 0xbe0c || // Lo       HANGUL SYLLABLE BEU
    code == 0xbe28 || // Lo       HANGUL SYLLABLE BYI
    code == 0xbe44 || // Lo       HANGUL SYLLABLE BI
    code == 0xbe60 || // Lo       HANGUL SYLLABLE BBA
    code == 0xbe7c || // Lo       HANGUL SYLLABLE BBAE
    code == 0xbe98 || // Lo       HANGUL SYLLABLE BBYA
    code == 0xbeb4 || // Lo       HANGUL SYLLABLE BBYAE
    code == 0xbed0 || // Lo       HANGUL SYLLABLE BBEO
    code == 0xbeec || // Lo       HANGUL SYLLABLE BBE
    code == 0xbf08 || // Lo       HANGUL SYLLABLE BBYEO
    code == 0xbf24 || // Lo       HANGUL SYLLABLE BBYE
    code == 0xbf40 || // Lo       HANGUL SYLLABLE BBO
    code == 0xbf5c || // Lo       HANGUL SYLLABLE BBWA
    code == 0xbf78 || // Lo       HANGUL SYLLABLE BBWAE
    code == 0xbf94 || // Lo       HANGUL SYLLABLE BBOE
    code == 0xbfb0 || // Lo       HANGUL SYLLABLE BBYO
    code == 0xbfcc || // Lo       HANGUL SYLLABLE BBU
    code == 0xbfe8 || // Lo       HANGUL SYLLABLE BBWEO
    code == 0xc004 || // Lo       HANGUL SYLLABLE BBWE
    code == 0xc020 || // Lo       HANGUL SYLLABLE BBWI
    code == 0xc03c || // Lo       HANGUL SYLLABLE BBYU
    code == 0xc058 || // Lo       HANGUL SYLLABLE BBEU
    code == 0xc074 || // Lo       HANGUL SYLLABLE BBYI
    code == 0xc090 || // Lo       HANGUL SYLLABLE BBI
    code == 0xc0ac || // Lo       HANGUL SYLLABLE SA
    code == 0xc0c8 || // Lo       HANGUL SYLLABLE SAE
    code == 0xc0e4 || // Lo       HANGUL SYLLABLE SYA
    code == 0xc100 || // Lo       HANGUL SYLLABLE SYAE
    code == 0xc11c || // Lo       HANGUL SYLLABLE SEO
    code == 0xc138 || // Lo       HANGUL SYLLABLE SE
    code == 0xc154 || // Lo       HANGUL SYLLABLE SYEO
    code == 0xc170 || // Lo       HANGUL SYLLABLE SYE
    code == 0xc18c || // Lo       HANGUL SYLLABLE SO
    code == 0xc1a8 || // Lo       HANGUL SYLLABLE SWA
    code == 0xc1c4 || // Lo       HANGUL SYLLABLE SWAE
    code == 0xc1e0 || // Lo       HANGUL SYLLABLE SOE
    code == 0xc1fc || // Lo       HANGUL SYLLABLE SYO
    code == 0xc218 || // Lo       HANGUL SYLLABLE SU
    code == 0xc234 || // Lo       HANGUL SYLLABLE SWEO
    code == 0xc250 || // Lo       HANGUL SYLLABLE SWE
    code == 0xc26c || // Lo       HANGUL SYLLABLE SWI
    code == 0xc288 || // Lo       HANGUL SYLLABLE SYU
    code == 0xc2a4 || // Lo       HANGUL SYLLABLE SEU
    code == 0xc2c0 || // Lo       HANGUL SYLLABLE SYI
    code == 0xc2dc || // Lo       HANGUL SYLLABLE SI
    code == 0xc2f8 || // Lo       HANGUL SYLLABLE SSA
    code == 0xc314 || // Lo       HANGUL SYLLABLE SSAE
    code == 0xc330 || // Lo       HANGUL SYLLABLE SSYA
    code == 0xc34c || // Lo       HANGUL SYLLABLE SSYAE
    code == 0xc368 || // Lo       HANGUL SYLLABLE SSEO
    code == 0xc384 || // Lo       HANGUL SYLLABLE SSE
    code == 0xc3a0 || // Lo       HANGUL SYLLABLE SSYEO
    code == 0xc3bc || // Lo       HANGUL SYLLABLE SSYE
    code == 0xc3d8 || // Lo       HANGUL SYLLABLE SSO
    code == 0xc3f4 || // Lo       HANGUL SYLLABLE SSWA
    code == 0xc410 || // Lo       HANGUL SYLLABLE SSWAE
    code == 0xc42c || // Lo       HANGUL SYLLABLE SSOE
    code == 0xc448 || // Lo       HANGUL SYLLABLE SSYO
    code == 0xc464 || // Lo       HANGUL SYLLABLE SSU
    code == 0xc480 || // Lo       HANGUL SYLLABLE SSWEO
    code == 0xc49c || // Lo       HANGUL SYLLABLE SSWE
    code == 0xc4b8 || // Lo       HANGUL SYLLABLE SSWI
    code == 0xc4d4 || // Lo       HANGUL SYLLABLE SSYU
    code == 0xc4f0 || // Lo       HANGUL SYLLABLE SSEU
    code == 0xc50c || // Lo       HANGUL SYLLABLE SSYI
    code == 0xc528 || // Lo       HANGUL SYLLABLE SSI
    code == 0xc544 || // Lo       HANGUL SYLLABLE A
    code == 0xc560 || // Lo       HANGUL SYLLABLE AE
    code == 0xc57c || // Lo       HANGUL SYLLABLE YA
    code == 0xc598 || // Lo       HANGUL SYLLABLE YAE
    code == 0xc5b4 || // Lo       HANGUL SYLLABLE EO
    code == 0xc5d0 || // Lo       HANGUL SYLLABLE E
    code == 0xc5ec || // Lo       HANGUL SYLLABLE YEO
    code == 0xc608 || // Lo       HANGUL SYLLABLE YE
    code == 0xc624 || // Lo       HANGUL SYLLABLE O
    code == 0xc640 || // Lo       HANGUL SYLLABLE WA
    code == 0xc65c || // Lo       HANGUL SYLLABLE WAE
    code == 0xc678 || // Lo       HANGUL SYLLABLE OE
    code == 0xc694 || // Lo       HANGUL SYLLABLE YO
    code == 0xc6b0 || // Lo       HANGUL SYLLABLE U
    code == 0xc6cc || // Lo       HANGUL SYLLABLE WEO
    code == 0xc6e8 || // Lo       HANGUL SYLLABLE WE
    code == 0xc704 || // Lo       HANGUL SYLLABLE WI
    code == 0xc720 || // Lo       HANGUL SYLLABLE YU
    code == 0xc73c || // Lo       HANGUL SYLLABLE EU
    code == 0xc758 || // Lo       HANGUL SYLLABLE YI
    code == 0xc774 || // Lo       HANGUL SYLLABLE I
    code == 0xc790 || // Lo       HANGUL SYLLABLE JA
    code == 0xc7ac || // Lo       HANGUL SYLLABLE JAE
    code == 0xc7c8 || // Lo       HANGUL SYLLABLE JYA
    code == 0xc7e4 || // Lo       HANGUL SYLLABLE JYAE
    code == 0xc800 || // Lo       HANGUL SYLLABLE JEO
    code == 0xc81c || // Lo       HANGUL SYLLABLE JE
    code == 0xc838 || // Lo       HANGUL SYLLABLE JYEO
    code == 0xc854 || // Lo       HANGUL SYLLABLE JYE
    code == 0xc870 || // Lo       HANGUL SYLLABLE JO
    code == 0xc88c || // Lo       HANGUL SYLLABLE JWA
    code == 0xc8a8 || // Lo       HANGUL SYLLABLE JWAE
    code == 0xc8c4 || // Lo       HANGUL SYLLABLE JOE
    code == 0xc8e0 || // Lo       HANGUL SYLLABLE JYO
    code == 0xc8fc || // Lo       HANGUL SYLLABLE JU
    code == 0xc918 || // Lo       HANGUL SYLLABLE JWEO
    code == 0xc934 || // Lo       HANGUL SYLLABLE JWE
    code == 0xc950 || // Lo       HANGUL SYLLABLE JWI
    code == 0xc96c || // Lo       HANGUL SYLLABLE JYU
    code == 0xc988 || // Lo       HANGUL SYLLABLE JEU
    code == 0xc9a4 || // Lo       HANGUL SYLLABLE JYI
    code == 0xc9c0 || // Lo       HANGUL SYLLABLE JI
    code == 0xc9dc || // Lo       HANGUL SYLLABLE JJA
    code == 0xc9f8 || // Lo       HANGUL SYLLABLE JJAE
    code == 0xca14 || // Lo       HANGUL SYLLABLE JJYA
    code == 0xca30 || // Lo       HANGUL SYLLABLE JJYAE
    code == 0xca4c || // Lo       HANGUL SYLLABLE JJEO
    code == 0xca68 || // Lo       HANGUL SYLLABLE JJE
    code == 0xca84 || // Lo       HANGUL SYLLABLE JJYEO
    code == 0xcaa0 || // Lo       HANGUL SYLLABLE JJYE
    code == 0xcabc || // Lo       HANGUL SYLLABLE JJO
    code == 0xcad8 || // Lo       HANGUL SYLLABLE JJWA
    code == 0xcaf4 || // Lo       HANGUL SYLLABLE JJWAE
    code == 0xcb10 || // Lo       HANGUL SYLLABLE JJOE
    code == 0xcb2c || // Lo       HANGUL SYLLABLE JJYO
    code == 0xcb48 || // Lo       HANGUL SYLLABLE JJU
    code == 0xcb64 || // Lo       HANGUL SYLLABLE JJWEO
    code == 0xcb80 || // Lo       HANGUL SYLLABLE JJWE
    code == 0xcb9c || // Lo       HANGUL SYLLABLE JJWI
    code == 0xcbb8 || // Lo       HANGUL SYLLABLE JJYU
    code == 0xcbd4 || // Lo       HANGUL SYLLABLE JJEU
    code == 0xcbf0 || // Lo       HANGUL SYLLABLE JJYI
    code == 0xcc0c || // Lo       HANGUL SYLLABLE JJI
    code == 0xcc28 || // Lo       HANGUL SYLLABLE CA
    code == 0xcc44 || // Lo       HANGUL SYLLABLE CAE
    code == 0xcc60 || // Lo       HANGUL SYLLABLE CYA
    code == 0xcc7c || // Lo       HANGUL SYLLABLE CYAE
    code == 0xcc98 || // Lo       HANGUL SYLLABLE CEO
    code == 0xccb4 || // Lo       HANGUL SYLLABLE CE
    code == 0xccd0 || // Lo       HANGUL SYLLABLE CYEO
    code == 0xccec || // Lo       HANGUL SYLLABLE CYE
    code == 0xcd08 || // Lo       HANGUL SYLLABLE CO
    code == 0xcd24 || // Lo       HANGUL SYLLABLE CWA
    code == 0xcd40 || // Lo       HANGUL SYLLABLE CWAE
    code == 0xcd5c || // Lo       HANGUL SYLLABLE COE
    code == 0xcd78 || // Lo       HANGUL SYLLABLE CYO
    code == 0xcd94 || // Lo       HANGUL SYLLABLE CU
    code == 0xcdb0 || // Lo       HANGUL SYLLABLE CWEO
    code == 0xcdcc || // Lo       HANGUL SYLLABLE CWE
    code == 0xcde8 || // Lo       HANGUL SYLLABLE CWI
    code == 0xce04 || // Lo       HANGUL SYLLABLE CYU
    code == 0xce20 || // Lo       HANGUL SYLLABLE CEU
    code == 0xce3c || // Lo       HANGUL SYLLABLE CYI
    code == 0xce58 || // Lo       HANGUL SYLLABLE CI
    code == 0xce74 || // Lo       HANGUL SYLLABLE KA
    code == 0xce90 || // Lo       HANGUL SYLLABLE KAE
    code == 0xceac || // Lo       HANGUL SYLLABLE KYA
    code == 0xcec8 || // Lo       HANGUL SYLLABLE KYAE
    code == 0xcee4 || // Lo       HANGUL SYLLABLE KEO
    code == 0xcf00 || // Lo       HANGUL SYLLABLE KE
    code == 0xcf1c || // Lo       HANGUL SYLLABLE KYEO
    code == 0xcf38 || // Lo       HANGUL SYLLABLE KYE
    code == 0xcf54 || // Lo       HANGUL SYLLABLE KO
    code == 0xcf70 || // Lo       HANGUL SYLLABLE KWA
    code == 0xcf8c || // Lo       HANGUL SYLLABLE KWAE
    code == 0xcfa8 || // Lo       HANGUL SYLLABLE KOE
    code == 0xcfc4 || // Lo       HANGUL SYLLABLE KYO
    code == 0xcfe0 || // Lo       HANGUL SYLLABLE KU
    code == 0xcffc || // Lo       HANGUL SYLLABLE KWEO
    code == 0xd018 || // Lo       HANGUL SYLLABLE KWE
    code == 0xd034 || // Lo       HANGUL SYLLABLE KWI
    code == 0xd050 || // Lo       HANGUL SYLLABLE KYU
    code == 0xd06c || // Lo       HANGUL SYLLABLE KEU
    code == 0xd088 || // Lo       HANGUL SYLLABLE KYI
    code == 0xd0a4 || // Lo       HANGUL SYLLABLE KI
    code == 0xd0c0 || // Lo       HANGUL SYLLABLE TA
    code == 0xd0dc || // Lo       HANGUL SYLLABLE TAE
    code == 0xd0f8 || // Lo       HANGUL SYLLABLE TYA
    code == 0xd114 || // Lo       HANGUL SYLLABLE TYAE
    code == 0xd130 || // Lo       HANGUL SYLLABLE TEO
    code == 0xd14c || // Lo       HANGUL SYLLABLE TE
    code == 0xd168 || // Lo       HANGUL SYLLABLE TYEO
    code == 0xd184 || // Lo       HANGUL SYLLABLE TYE
    code == 0xd1a0 || // Lo       HANGUL SYLLABLE TO
    code == 0xd1bc || // Lo       HANGUL SYLLABLE TWA
    code == 0xd1d8 || // Lo       HANGUL SYLLABLE TWAE
    code == 0xd1f4 || // Lo       HANGUL SYLLABLE TOE
    code == 0xd210 || // Lo       HANGUL SYLLABLE TYO
    code == 0xd22c || // Lo       HANGUL SYLLABLE TU
    code == 0xd248 || // Lo       HANGUL SYLLABLE TWEO
    code == 0xd264 || // Lo       HANGUL SYLLABLE TWE
    code == 0xd280 || // Lo       HANGUL SYLLABLE TWI
    code == 0xd29c || // Lo       HANGUL SYLLABLE TYU
    code == 0xd2b8 || // Lo       HANGUL SYLLABLE TEU
    code == 0xd2d4 || // Lo       HANGUL SYLLABLE TYI
    code == 0xd2f0 || // Lo       HANGUL SYLLABLE TI
    code == 0xd30c || // Lo       HANGUL SYLLABLE PA
    code == 0xd328 || // Lo       HANGUL SYLLABLE PAE
    code == 0xd344 || // Lo       HANGUL SYLLABLE PYA
    code == 0xd360 || // Lo       HANGUL SYLLABLE PYAE
    code == 0xd37c || // Lo       HANGUL SYLLABLE PEO
    code == 0xd398 || // Lo       HANGUL SYLLABLE PE
    code == 0xd3b4 || // Lo       HANGUL SYLLABLE PYEO
    code == 0xd3d0 || // Lo       HANGUL SYLLABLE PYE
    code == 0xd3ec || // Lo       HANGUL SYLLABLE PO
    code == 0xd408 || // Lo       HANGUL SYLLABLE PWA
    code == 0xd424 || // Lo       HANGUL SYLLABLE PWAE
    code == 0xd440 || // Lo       HANGUL SYLLABLE POE
    code == 0xd45c || // Lo       HANGUL SYLLABLE PYO
    code == 0xd478 || // Lo       HANGUL SYLLABLE PU
    code == 0xd494 || // Lo       HANGUL SYLLABLE PWEO
    code == 0xd4b0 || // Lo       HANGUL SYLLABLE PWE
    code == 0xd4cc || // Lo       HANGUL SYLLABLE PWI
    code == 0xd4e8 || // Lo       HANGUL SYLLABLE PYU
    code == 0xd504 || // Lo       HANGUL SYLLABLE PEU
    code == 0xd520 || // Lo       HANGUL SYLLABLE PYI
    code == 0xd53c || // Lo       HANGUL SYLLABLE PI
    code == 0xd558 || // Lo       HANGUL SYLLABLE HA
    code == 0xd574 || // Lo       HANGUL SYLLABLE HAE
    code == 0xd590 || // Lo       HANGUL SYLLABLE HYA
    code == 0xd5ac || // Lo       HANGUL SYLLABLE HYAE
    code == 0xd5c8 || // Lo       HANGUL SYLLABLE HEO
    code == 0xd5e4 || // Lo       HANGUL SYLLABLE HE
    code == 0xd600 || // Lo       HANGUL SYLLABLE HYEO
    code == 0xd61c || // Lo       HANGUL SYLLABLE HYE
    code == 0xd638 || // Lo       HANGUL SYLLABLE HO
    code == 0xd654 || // Lo       HANGUL SYLLABLE HWA
    code == 0xd670 || // Lo       HANGUL SYLLABLE HWAE
    code == 0xd68c || // Lo       HANGUL SYLLABLE HOE
    code == 0xd6a8 || // Lo       HANGUL SYLLABLE HYO
    code == 0xd6c4 || // Lo       HANGUL SYLLABLE HU
    code == 0xd6e0 || // Lo       HANGUL SYLLABLE HWEO
    code == 0xd6fc || // Lo       HANGUL SYLLABLE HWE
    code == 0xd718 || // Lo       HANGUL SYLLABLE HWI
    code == 0xd734 || // Lo       HANGUL SYLLABLE HYU
    code == 0xd750 || // Lo       HANGUL SYLLABLE HEU
    code == 0xd76c || // Lo       HANGUL SYLLABLE HYI
    code == 0xd788 // Lo       HANGUL SYLLABLE HI
  ) {
    return LV
  }

  if (
    (0xac01 <= code && code <= 0xac1b) || // Lo  [27] HANGUL SYLLABLE GAG..HANGUL SYLLABLE GAH
    (0xac1d <= code && code <= 0xac37) || // Lo  [27] HANGUL SYLLABLE GAEG..HANGUL SYLLABLE GAEH
    (0xac39 <= code && code <= 0xac53) || // Lo  [27] HANGUL SYLLABLE GYAG..HANGUL SYLLABLE GYAH
    (0xac55 <= code && code <= 0xac6f) || // Lo  [27] HANGUL SYLLABLE GYAEG..HANGUL SYLLABLE GYAEH
    (0xac71 <= code && code <= 0xac8b) || // Lo  [27] HANGUL SYLLABLE GEOG..HANGUL SYLLABLE GEOH
    (0xac8d <= code && code <= 0xaca7) || // Lo  [27] HANGUL SYLLABLE GEG..HANGUL SYLLABLE GEH
    (0xaca9 <= code && code <= 0xacc3) || // Lo  [27] HANGUL SYLLABLE GYEOG..HANGUL SYLLABLE GYEOH
    (0xacc5 <= code && code <= 0xacdf) || // Lo  [27] HANGUL SYLLABLE GYEG..HANGUL SYLLABLE GYEH
    (0xace1 <= code && code <= 0xacfb) || // Lo  [27] HANGUL SYLLABLE GOG..HANGUL SYLLABLE GOH
    (0xacfd <= code && code <= 0xad17) || // Lo  [27] HANGUL SYLLABLE GWAG..HANGUL SYLLABLE GWAH
    (0xad19 <= code && code <= 0xad33) || // Lo  [27] HANGUL SYLLABLE GWAEG..HANGUL SYLLABLE GWAEH
    (0xad35 <= code && code <= 0xad4f) || // Lo  [27] HANGUL SYLLABLE GOEG..HANGUL SYLLABLE GOEH
    (0xad51 <= code && code <= 0xad6b) || // Lo  [27] HANGUL SYLLABLE GYOG..HANGUL SYLLABLE GYOH
    (0xad6d <= code && code <= 0xad87) || // Lo  [27] HANGUL SYLLABLE GUG..HANGUL SYLLABLE GUH
    (0xad89 <= code && code <= 0xada3) || // Lo  [27] HANGUL SYLLABLE GWEOG..HANGUL SYLLABLE GWEOH
    (0xada5 <= code && code <= 0xadbf) || // Lo  [27] HANGUL SYLLABLE GWEG..HANGUL SYLLABLE GWEH
    (0xadc1 <= code && code <= 0xaddb) || // Lo  [27] HANGUL SYLLABLE GWIG..HANGUL SYLLABLE GWIH
    (0xaddd <= code && code <= 0xadf7) || // Lo  [27] HANGUL SYLLABLE GYUG..HANGUL SYLLABLE GYUH
    (0xadf9 <= code && code <= 0xae13) || // Lo  [27] HANGUL SYLLABLE GEUG..HANGUL SYLLABLE GEUH
    (0xae15 <= code && code <= 0xae2f) || // Lo  [27] HANGUL SYLLABLE GYIG..HANGUL SYLLABLE GYIH
    (0xae31 <= code && code <= 0xae4b) || // Lo  [27] HANGUL SYLLABLE GIG..HANGUL SYLLABLE GIH
    (0xae4d <= code && code <= 0xae67) || // Lo  [27] HANGUL SYLLABLE GGAG..HANGUL SYLLABLE GGAH
    (0xae69 <= code && code <= 0xae83) || // Lo  [27] HANGUL SYLLABLE GGAEG..HANGUL SYLLABLE GGAEH
    (0xae85 <= code && code <= 0xae9f) || // Lo  [27] HANGUL SYLLABLE GGYAG..HANGUL SYLLABLE GGYAH
    (0xaea1 <= code && code <= 0xaebb) || // Lo  [27] HANGUL SYLLABLE GGYAEG..HANGUL SYLLABLE GGYAEH
    (0xaebd <= code && code <= 0xaed7) || // Lo  [27] HANGUL SYLLABLE GGEOG..HANGUL SYLLABLE GGEOH
    (0xaed9 <= code && code <= 0xaef3) || // Lo  [27] HANGUL SYLLABLE GGEG..HANGUL SYLLABLE GGEH
    (0xaef5 <= code && code <= 0xaf0f) || // Lo  [27] HANGUL SYLLABLE GGYEOG..HANGUL SYLLABLE GGYEOH
    (0xaf11 <= code && code <= 0xaf2b) || // Lo  [27] HANGUL SYLLABLE GGYEG..HANGUL SYLLABLE GGYEH
    (0xaf2d <= code && code <= 0xaf47) || // Lo  [27] HANGUL SYLLABLE GGOG..HANGUL SYLLABLE GGOH
    (0xaf49 <= code && code <= 0xaf63) || // Lo  [27] HANGUL SYLLABLE GGWAG..HANGUL SYLLABLE GGWAH
    (0xaf65 <= code && code <= 0xaf7f) || // Lo  [27] HANGUL SYLLABLE GGWAEG..HANGUL SYLLABLE GGWAEH
    (0xaf81 <= code && code <= 0xaf9b) || // Lo  [27] HANGUL SYLLABLE GGOEG..HANGUL SYLLABLE GGOEH
    (0xaf9d <= code && code <= 0xafb7) || // Lo  [27] HANGUL SYLLABLE GGYOG..HANGUL SYLLABLE GGYOH
    (0xafb9 <= code && code <= 0xafd3) || // Lo  [27] HANGUL SYLLABLE GGUG..HANGUL SYLLABLE GGUH
    (0xafd5 <= code && code <= 0xafef) || // Lo  [27] HANGUL SYLLABLE GGWEOG..HANGUL SYLLABLE GGWEOH
    (0xaff1 <= code && code <= 0xb00b) || // Lo  [27] HANGUL SYLLABLE GGWEG..HANGUL SYLLABLE GGWEH
    (0xb00d <= code && code <= 0xb027) || // Lo  [27] HANGUL SYLLABLE GGWIG..HANGUL SYLLABLE GGWIH
    (0xb029 <= code && code <= 0xb043) || // Lo  [27] HANGUL SYLLABLE GGYUG..HANGUL SYLLABLE GGYUH
    (0xb045 <= code && code <= 0xb05f) || // Lo  [27] HANGUL SYLLABLE GGEUG..HANGUL SYLLABLE GGEUH
    (0xb061 <= code && code <= 0xb07b) || // Lo  [27] HANGUL SYLLABLE GGYIG..HANGUL SYLLABLE GGYIH
    (0xb07d <= code && code <= 0xb097) || // Lo  [27] HANGUL SYLLABLE GGIG..HANGUL SYLLABLE GGIH
    (0xb099 <= code && code <= 0xb0b3) || // Lo  [27] HANGUL SYLLABLE NAG..HANGUL SYLLABLE NAH
    (0xb0b5 <= code && code <= 0xb0cf) || // Lo  [27] HANGUL SYLLABLE NAEG..HANGUL SYLLABLE NAEH
    (0xb0d1 <= code && code <= 0xb0eb) || // Lo  [27] HANGUL SYLLABLE NYAG..HANGUL SYLLABLE NYAH
    (0xb0ed <= code && code <= 0xb107) || // Lo  [27] HANGUL SYLLABLE NYAEG..HANGUL SYLLABLE NYAEH
    (0xb109 <= code && code <= 0xb123) || // Lo  [27] HANGUL SYLLABLE NEOG..HANGUL SYLLABLE NEOH
    (0xb125 <= code && code <= 0xb13f) || // Lo  [27] HANGUL SYLLABLE NEG..HANGUL SYLLABLE NEH
    (0xb141 <= code && code <= 0xb15b) || // Lo  [27] HANGUL SYLLABLE NYEOG..HANGUL SYLLABLE NYEOH
    (0xb15d <= code && code <= 0xb177) || // Lo  [27] HANGUL SYLLABLE NYEG..HANGUL SYLLABLE NYEH
    (0xb179 <= code && code <= 0xb193) || // Lo  [27] HANGUL SYLLABLE NOG..HANGUL SYLLABLE NOH
    (0xb195 <= code && code <= 0xb1af) || // Lo  [27] HANGUL SYLLABLE NWAG..HANGUL SYLLABLE NWAH
    (0xb1b1 <= code && code <= 0xb1cb) || // Lo  [27] HANGUL SYLLABLE NWAEG..HANGUL SYLLABLE NWAEH
    (0xb1cd <= code && code <= 0xb1e7) || // Lo  [27] HANGUL SYLLABLE NOEG..HANGUL SYLLABLE NOEH
    (0xb1e9 <= code && code <= 0xb203) || // Lo  [27] HANGUL SYLLABLE NYOG..HANGUL SYLLABLE NYOH
    (0xb205 <= code && code <= 0xb21f) || // Lo  [27] HANGUL SYLLABLE NUG..HANGUL SYLLABLE NUH
    (0xb221 <= code && code <= 0xb23b) || // Lo  [27] HANGUL SYLLABLE NWEOG..HANGUL SYLLABLE NWEOH
    (0xb23d <= code && code <= 0xb257) || // Lo  [27] HANGUL SYLLABLE NWEG..HANGUL SYLLABLE NWEH
    (0xb259 <= code && code <= 0xb273) || // Lo  [27] HANGUL SYLLABLE NWIG..HANGUL SYLLABLE NWIH
    (0xb275 <= code && code <= 0xb28f) || // Lo  [27] HANGUL SYLLABLE NYUG..HANGUL SYLLABLE NYUH
    (0xb291 <= code && code <= 0xb2ab) || // Lo  [27] HANGUL SYLLABLE NEUG..HANGUL SYLLABLE NEUH
    (0xb2ad <= code && code <= 0xb2c7) || // Lo  [27] HANGUL SYLLABLE NYIG..HANGUL SYLLABLE NYIH
    (0xb2c9 <= code && code <= 0xb2e3) || // Lo  [27] HANGUL SYLLABLE NIG..HANGUL SYLLABLE NIH
    (0xb2e5 <= code && code <= 0xb2ff) || // Lo  [27] HANGUL SYLLABLE DAG..HANGUL SYLLABLE DAH
    (0xb301 <= code && code <= 0xb31b) || // Lo  [27] HANGUL SYLLABLE DAEG..HANGUL SYLLABLE DAEH
    (0xb31d <= code && code <= 0xb337) || // Lo  [27] HANGUL SYLLABLE DYAG..HANGUL SYLLABLE DYAH
    (0xb339 <= code && code <= 0xb353) || // Lo  [27] HANGUL SYLLABLE DYAEG..HANGUL SYLLABLE DYAEH
    (0xb355 <= code && code <= 0xb36f) || // Lo  [27] HANGUL SYLLABLE DEOG..HANGUL SYLLABLE DEOH
    (0xb371 <= code && code <= 0xb38b) || // Lo  [27] HANGUL SYLLABLE DEG..HANGUL SYLLABLE DEH
    (0xb38d <= code && code <= 0xb3a7) || // Lo  [27] HANGUL SYLLABLE DYEOG..HANGUL SYLLABLE DYEOH
    (0xb3a9 <= code && code <= 0xb3c3) || // Lo  [27] HANGUL SYLLABLE DYEG..HANGUL SYLLABLE DYEH
    (0xb3c5 <= code && code <= 0xb3df) || // Lo  [27] HANGUL SYLLABLE DOG..HANGUL SYLLABLE DOH
    (0xb3e1 <= code && code <= 0xb3fb) || // Lo  [27] HANGUL SYLLABLE DWAG..HANGUL SYLLABLE DWAH
    (0xb3fd <= code && code <= 0xb417) || // Lo  [27] HANGUL SYLLABLE DWAEG..HANGUL SYLLABLE DWAEH
    (0xb419 <= code && code <= 0xb433) || // Lo  [27] HANGUL SYLLABLE DOEG..HANGUL SYLLABLE DOEH
    (0xb435 <= code && code <= 0xb44f) || // Lo  [27] HANGUL SYLLABLE DYOG..HANGUL SYLLABLE DYOH
    (0xb451 <= code && code <= 0xb46b) || // Lo  [27] HANGUL SYLLABLE DUG..HANGUL SYLLABLE DUH
    (0xb46d <= code && code <= 0xb487) || // Lo  [27] HANGUL SYLLABLE DWEOG..HANGUL SYLLABLE DWEOH
    (0xb489 <= code && code <= 0xb4a3) || // Lo  [27] HANGUL SYLLABLE DWEG..HANGUL SYLLABLE DWEH
    (0xb4a5 <= code && code <= 0xb4bf) || // Lo  [27] HANGUL SYLLABLE DWIG..HANGUL SYLLABLE DWIH
    (0xb4c1 <= code && code <= 0xb4db) || // Lo  [27] HANGUL SYLLABLE DYUG..HANGUL SYLLABLE DYUH
    (0xb4dd <= code && code <= 0xb4f7) || // Lo  [27] HANGUL SYLLABLE DEUG..HANGUL SYLLABLE DEUH
    (0xb4f9 <= code && code <= 0xb513) || // Lo  [27] HANGUL SYLLABLE DYIG..HANGUL SYLLABLE DYIH
    (0xb515 <= code && code <= 0xb52f) || // Lo  [27] HANGUL SYLLABLE DIG..HANGUL SYLLABLE DIH
    (0xb531 <= code && code <= 0xb54b) || // Lo  [27] HANGUL SYLLABLE DDAG..HANGUL SYLLABLE DDAH
    (0xb54d <= code && code <= 0xb567) || // Lo  [27] HANGUL SYLLABLE DDAEG..HANGUL SYLLABLE DDAEH
    (0xb569 <= code && code <= 0xb583) || // Lo  [27] HANGUL SYLLABLE DDYAG..HANGUL SYLLABLE DDYAH
    (0xb585 <= code && code <= 0xb59f) || // Lo  [27] HANGUL SYLLABLE DDYAEG..HANGUL SYLLABLE DDYAEH
    (0xb5a1 <= code && code <= 0xb5bb) || // Lo  [27] HANGUL SYLLABLE DDEOG..HANGUL SYLLABLE DDEOH
    (0xb5bd <= code && code <= 0xb5d7) || // Lo  [27] HANGUL SYLLABLE DDEG..HANGUL SYLLABLE DDEH
    (0xb5d9 <= code && code <= 0xb5f3) || // Lo  [27] HANGUL SYLLABLE DDYEOG..HANGUL SYLLABLE DDYEOH
    (0xb5f5 <= code && code <= 0xb60f) || // Lo  [27] HANGUL SYLLABLE DDYEG..HANGUL SYLLABLE DDYEH
    (0xb611 <= code && code <= 0xb62b) || // Lo  [27] HANGUL SYLLABLE DDOG..HANGUL SYLLABLE DDOH
    (0xb62d <= code && code <= 0xb647) || // Lo  [27] HANGUL SYLLABLE DDWAG..HANGUL SYLLABLE DDWAH
    (0xb649 <= code && code <= 0xb663) || // Lo  [27] HANGUL SYLLABLE DDWAEG..HANGUL SYLLABLE DDWAEH
    (0xb665 <= code && code <= 0xb67f) || // Lo  [27] HANGUL SYLLABLE DDOEG..HANGUL SYLLABLE DDOEH
    (0xb681 <= code && code <= 0xb69b) || // Lo  [27] HANGUL SYLLABLE DDYOG..HANGUL SYLLABLE DDYOH
    (0xb69d <= code && code <= 0xb6b7) || // Lo  [27] HANGUL SYLLABLE DDUG..HANGUL SYLLABLE DDUH
    (0xb6b9 <= code && code <= 0xb6d3) || // Lo  [27] HANGUL SYLLABLE DDWEOG..HANGUL SYLLABLE DDWEOH
    (0xb6d5 <= code && code <= 0xb6ef) || // Lo  [27] HANGUL SYLLABLE DDWEG..HANGUL SYLLABLE DDWEH
    (0xb6f1 <= code && code <= 0xb70b) || // Lo  [27] HANGUL SYLLABLE DDWIG..HANGUL SYLLABLE DDWIH
    (0xb70d <= code && code <= 0xb727) || // Lo  [27] HANGUL SYLLABLE DDYUG..HANGUL SYLLABLE DDYUH
    (0xb729 <= code && code <= 0xb743) || // Lo  [27] HANGUL SYLLABLE DDEUG..HANGUL SYLLABLE DDEUH
    (0xb745 <= code && code <= 0xb75f) || // Lo  [27] HANGUL SYLLABLE DDYIG..HANGUL SYLLABLE DDYIH
    (0xb761 <= code && code <= 0xb77b) || // Lo  [27] HANGUL SYLLABLE DDIG..HANGUL SYLLABLE DDIH
    (0xb77d <= code && code <= 0xb797) || // Lo  [27] HANGUL SYLLABLE RAG..HANGUL SYLLABLE RAH
    (0xb799 <= code && code <= 0xb7b3) || // Lo  [27] HANGUL SYLLABLE RAEG..HANGUL SYLLABLE RAEH
    (0xb7b5 <= code && code <= 0xb7cf) || // Lo  [27] HANGUL SYLLABLE RYAG..HANGUL SYLLABLE RYAH
    (0xb7d1 <= code && code <= 0xb7eb) || // Lo  [27] HANGUL SYLLABLE RYAEG..HANGUL SYLLABLE RYAEH
    (0xb7ed <= code && code <= 0xb807) || // Lo  [27] HANGUL SYLLABLE REOG..HANGUL SYLLABLE REOH
    (0xb809 <= code && code <= 0xb823) || // Lo  [27] HANGUL SYLLABLE REG..HANGUL SYLLABLE REH
    (0xb825 <= code && code <= 0xb83f) || // Lo  [27] HANGUL SYLLABLE RYEOG..HANGUL SYLLABLE RYEOH
    (0xb841 <= code && code <= 0xb85b) || // Lo  [27] HANGUL SYLLABLE RYEG..HANGUL SYLLABLE RYEH
    (0xb85d <= code && code <= 0xb877) || // Lo  [27] HANGUL SYLLABLE ROG..HANGUL SYLLABLE ROH
    (0xb879 <= code && code <= 0xb893) || // Lo  [27] HANGUL SYLLABLE RWAG..HANGUL SYLLABLE RWAH
    (0xb895 <= code && code <= 0xb8af) || // Lo  [27] HANGUL SYLLABLE RWAEG..HANGUL SYLLABLE RWAEH
    (0xb8b1 <= code && code <= 0xb8cb) || // Lo  [27] HANGUL SYLLABLE ROEG..HANGUL SYLLABLE ROEH
    (0xb8cd <= code && code <= 0xb8e7) || // Lo  [27] HANGUL SYLLABLE RYOG..HANGUL SYLLABLE RYOH
    (0xb8e9 <= code && code <= 0xb903) || // Lo  [27] HANGUL SYLLABLE RUG..HANGUL SYLLABLE RUH
    (0xb905 <= code && code <= 0xb91f) || // Lo  [27] HANGUL SYLLABLE RWEOG..HANGUL SYLLABLE RWEOH
    (0xb921 <= code && code <= 0xb93b) || // Lo  [27] HANGUL SYLLABLE RWEG..HANGUL SYLLABLE RWEH
    (0xb93d <= code && code <= 0xb957) || // Lo  [27] HANGUL SYLLABLE RWIG..HANGUL SYLLABLE RWIH
    (0xb959 <= code && code <= 0xb973) || // Lo  [27] HANGUL SYLLABLE RYUG..HANGUL SYLLABLE RYUH
    (0xb975 <= code && code <= 0xb98f) || // Lo  [27] HANGUL SYLLABLE REUG..HANGUL SYLLABLE REUH
    (0xb991 <= code && code <= 0xb9ab) || // Lo  [27] HANGUL SYLLABLE RYIG..HANGUL SYLLABLE RYIH
    (0xb9ad <= code && code <= 0xb9c7) || // Lo  [27] HANGUL SYLLABLE RIG..HANGUL SYLLABLE RIH
    (0xb9c9 <= code && code <= 0xb9e3) || // Lo  [27] HANGUL SYLLABLE MAG..HANGUL SYLLABLE MAH
    (0xb9e5 <= code && code <= 0xb9ff) || // Lo  [27] HANGUL SYLLABLE MAEG..HANGUL SYLLABLE MAEH
    (0xba01 <= code && code <= 0xba1b) || // Lo  [27] HANGUL SYLLABLE MYAG..HANGUL SYLLABLE MYAH
    (0xba1d <= code && code <= 0xba37) || // Lo  [27] HANGUL SYLLABLE MYAEG..HANGUL SYLLABLE MYAEH
    (0xba39 <= code && code <= 0xba53) || // Lo  [27] HANGUL SYLLABLE MEOG..HANGUL SYLLABLE MEOH
    (0xba55 <= code && code <= 0xba6f) || // Lo  [27] HANGUL SYLLABLE MEG..HANGUL SYLLABLE MEH
    (0xba71 <= code && code <= 0xba8b) || // Lo  [27] HANGUL SYLLABLE MYEOG..HANGUL SYLLABLE MYEOH
    (0xba8d <= code && code <= 0xbaa7) || // Lo  [27] HANGUL SYLLABLE MYEG..HANGUL SYLLABLE MYEH
    (0xbaa9 <= code && code <= 0xbac3) || // Lo  [27] HANGUL SYLLABLE MOG..HANGUL SYLLABLE MOH
    (0xbac5 <= code && code <= 0xbadf) || // Lo  [27] HANGUL SYLLABLE MWAG..HANGUL SYLLABLE MWAH
    (0xbae1 <= code && code <= 0xbafb) || // Lo  [27] HANGUL SYLLABLE MWAEG..HANGUL SYLLABLE MWAEH
    (0xbafd <= code && code <= 0xbb17) || // Lo  [27] HANGUL SYLLABLE MOEG..HANGUL SYLLABLE MOEH
    (0xbb19 <= code && code <= 0xbb33) || // Lo  [27] HANGUL SYLLABLE MYOG..HANGUL SYLLABLE MYOH
    (0xbb35 <= code && code <= 0xbb4f) || // Lo  [27] HANGUL SYLLABLE MUG..HANGUL SYLLABLE MUH
    (0xbb51 <= code && code <= 0xbb6b) || // Lo  [27] HANGUL SYLLABLE MWEOG..HANGUL SYLLABLE MWEOH
    (0xbb6d <= code && code <= 0xbb87) || // Lo  [27] HANGUL SYLLABLE MWEG..HANGUL SYLLABLE MWEH
    (0xbb89 <= code && code <= 0xbba3) || // Lo  [27] HANGUL SYLLABLE MWIG..HANGUL SYLLABLE MWIH
    (0xbba5 <= code && code <= 0xbbbf) || // Lo  [27] HANGUL SYLLABLE MYUG..HANGUL SYLLABLE MYUH
    (0xbbc1 <= code && code <= 0xbbdb) || // Lo  [27] HANGUL SYLLABLE MEUG..HANGUL SYLLABLE MEUH
    (0xbbdd <= code && code <= 0xbbf7) || // Lo  [27] HANGUL SYLLABLE MYIG..HANGUL SYLLABLE MYIH
    (0xbbf9 <= code && code <= 0xbc13) || // Lo  [27] HANGUL SYLLABLE MIG..HANGUL SYLLABLE MIH
    (0xbc15 <= code && code <= 0xbc2f) || // Lo  [27] HANGUL SYLLABLE BAG..HANGUL SYLLABLE BAH
    (0xbc31 <= code && code <= 0xbc4b) || // Lo  [27] HANGUL SYLLABLE BAEG..HANGUL SYLLABLE BAEH
    (0xbc4d <= code && code <= 0xbc67) || // Lo  [27] HANGUL SYLLABLE BYAG..HANGUL SYLLABLE BYAH
    (0xbc69 <= code && code <= 0xbc83) || // Lo  [27] HANGUL SYLLABLE BYAEG..HANGUL SYLLABLE BYAEH
    (0xbc85 <= code && code <= 0xbc9f) || // Lo  [27] HANGUL SYLLABLE BEOG..HANGUL SYLLABLE BEOH
    (0xbca1 <= code && code <= 0xbcbb) || // Lo  [27] HANGUL SYLLABLE BEG..HANGUL SYLLABLE BEH
    (0xbcbd <= code && code <= 0xbcd7) || // Lo  [27] HANGUL SYLLABLE BYEOG..HANGUL SYLLABLE BYEOH
    (0xbcd9 <= code && code <= 0xbcf3) || // Lo  [27] HANGUL SYLLABLE BYEG..HANGUL SYLLABLE BYEH
    (0xbcf5 <= code && code <= 0xbd0f) || // Lo  [27] HANGUL SYLLABLE BOG..HANGUL SYLLABLE BOH
    (0xbd11 <= code && code <= 0xbd2b) || // Lo  [27] HANGUL SYLLABLE BWAG..HANGUL SYLLABLE BWAH
    (0xbd2d <= code && code <= 0xbd47) || // Lo  [27] HANGUL SYLLABLE BWAEG..HANGUL SYLLABLE BWAEH
    (0xbd49 <= code && code <= 0xbd63) || // Lo  [27] HANGUL SYLLABLE BOEG..HANGUL SYLLABLE BOEH
    (0xbd65 <= code && code <= 0xbd7f) || // Lo  [27] HANGUL SYLLABLE BYOG..HANGUL SYLLABLE BYOH
    (0xbd81 <= code && code <= 0xbd9b) || // Lo  [27] HANGUL SYLLABLE BUG..HANGUL SYLLABLE BUH
    (0xbd9d <= code && code <= 0xbdb7) || // Lo  [27] HANGUL SYLLABLE BWEOG..HANGUL SYLLABLE BWEOH
    (0xbdb9 <= code && code <= 0xbdd3) || // Lo  [27] HANGUL SYLLABLE BWEG..HANGUL SYLLABLE BWEH
    (0xbdd5 <= code && code <= 0xbdef) || // Lo  [27] HANGUL SYLLABLE BWIG..HANGUL SYLLABLE BWIH
    (0xbdf1 <= code && code <= 0xbe0b) || // Lo  [27] HANGUL SYLLABLE BYUG..HANGUL SYLLABLE BYUH
    (0xbe0d <= code && code <= 0xbe27) || // Lo  [27] HANGUL SYLLABLE BEUG..HANGUL SYLLABLE BEUH
    (0xbe29 <= code && code <= 0xbe43) || // Lo  [27] HANGUL SYLLABLE BYIG..HANGUL SYLLABLE BYIH
    (0xbe45 <= code && code <= 0xbe5f) || // Lo  [27] HANGUL SYLLABLE BIG..HANGUL SYLLABLE BIH
    (0xbe61 <= code && code <= 0xbe7b) || // Lo  [27] HANGUL SYLLABLE BBAG..HANGUL SYLLABLE BBAH
    (0xbe7d <= code && code <= 0xbe97) || // Lo  [27] HANGUL SYLLABLE BBAEG..HANGUL SYLLABLE BBAEH
    (0xbe99 <= code && code <= 0xbeb3) || // Lo  [27] HANGUL SYLLABLE BBYAG..HANGUL SYLLABLE BBYAH
    (0xbeb5 <= code && code <= 0xbecf) || // Lo  [27] HANGUL SYLLABLE BBYAEG..HANGUL SYLLABLE BBYAEH
    (0xbed1 <= code && code <= 0xbeeb) || // Lo  [27] HANGUL SYLLABLE BBEOG..HANGUL SYLLABLE BBEOH
    (0xbeed <= code && code <= 0xbf07) || // Lo  [27] HANGUL SYLLABLE BBEG..HANGUL SYLLABLE BBEH
    (0xbf09 <= code && code <= 0xbf23) || // Lo  [27] HANGUL SYLLABLE BBYEOG..HANGUL SYLLABLE BBYEOH
    (0xbf25 <= code && code <= 0xbf3f) || // Lo  [27] HANGUL SYLLABLE BBYEG..HANGUL SYLLABLE BBYEH
    (0xbf41 <= code && code <= 0xbf5b) || // Lo  [27] HANGUL SYLLABLE BBOG..HANGUL SYLLABLE BBOH
    (0xbf5d <= code && code <= 0xbf77) || // Lo  [27] HANGUL SYLLABLE BBWAG..HANGUL SYLLABLE BBWAH
    (0xbf79 <= code && code <= 0xbf93) || // Lo  [27] HANGUL SYLLABLE BBWAEG..HANGUL SYLLABLE BBWAEH
    (0xbf95 <= code && code <= 0xbfaf) || // Lo  [27] HANGUL SYLLABLE BBOEG..HANGUL SYLLABLE BBOEH
    (0xbfb1 <= code && code <= 0xbfcb) || // Lo  [27] HANGUL SYLLABLE BBYOG..HANGUL SYLLABLE BBYOH
    (0xbfcd <= code && code <= 0xbfe7) || // Lo  [27] HANGUL SYLLABLE BBUG..HANGUL SYLLABLE BBUH
    (0xbfe9 <= code && code <= 0xc003) || // Lo  [27] HANGUL SYLLABLE BBWEOG..HANGUL SYLLABLE BBWEOH
    (0xc005 <= code && code <= 0xc01f) || // Lo  [27] HANGUL SYLLABLE BBWEG..HANGUL SYLLABLE BBWEH
    (0xc021 <= code && code <= 0xc03b) || // Lo  [27] HANGUL SYLLABLE BBWIG..HANGUL SYLLABLE BBWIH
    (0xc03d <= code && code <= 0xc057) || // Lo  [27] HANGUL SYLLABLE BBYUG..HANGUL SYLLABLE BBYUH
    (0xc059 <= code && code <= 0xc073) || // Lo  [27] HANGUL SYLLABLE BBEUG..HANGUL SYLLABLE BBEUH
    (0xc075 <= code && code <= 0xc08f) || // Lo  [27] HANGUL SYLLABLE BBYIG..HANGUL SYLLABLE BBYIH
    (0xc091 <= code && code <= 0xc0ab) || // Lo  [27] HANGUL SYLLABLE BBIG..HANGUL SYLLABLE BBIH
    (0xc0ad <= code && code <= 0xc0c7) || // Lo  [27] HANGUL SYLLABLE SAG..HANGUL SYLLABLE SAH
    (0xc0c9 <= code && code <= 0xc0e3) || // Lo  [27] HANGUL SYLLABLE SAEG..HANGUL SYLLABLE SAEH
    (0xc0e5 <= code && code <= 0xc0ff) || // Lo  [27] HANGUL SYLLABLE SYAG..HANGUL SYLLABLE SYAH
    (0xc101 <= code && code <= 0xc11b) || // Lo  [27] HANGUL SYLLABLE SYAEG..HANGUL SYLLABLE SYAEH
    (0xc11d <= code && code <= 0xc137) || // Lo  [27] HANGUL SYLLABLE SEOG..HANGUL SYLLABLE SEOH
    (0xc139 <= code && code <= 0xc153) || // Lo  [27] HANGUL SYLLABLE SEG..HANGUL SYLLABLE SEH
    (0xc155 <= code && code <= 0xc16f) || // Lo  [27] HANGUL SYLLABLE SYEOG..HANGUL SYLLABLE SYEOH
    (0xc171 <= code && code <= 0xc18b) || // Lo  [27] HANGUL SYLLABLE SYEG..HANGUL SYLLABLE SYEH
    (0xc18d <= code && code <= 0xc1a7) || // Lo  [27] HANGUL SYLLABLE SOG..HANGUL SYLLABLE SOH
    (0xc1a9 <= code && code <= 0xc1c3) || // Lo  [27] HANGUL SYLLABLE SWAG..HANGUL SYLLABLE SWAH
    (0xc1c5 <= code && code <= 0xc1df) || // Lo  [27] HANGUL SYLLABLE SWAEG..HANGUL SYLLABLE SWAEH
    (0xc1e1 <= code && code <= 0xc1fb) || // Lo  [27] HANGUL SYLLABLE SOEG..HANGUL SYLLABLE SOEH
    (0xc1fd <= code && code <= 0xc217) || // Lo  [27] HANGUL SYLLABLE SYOG..HANGUL SYLLABLE SYOH
    (0xc219 <= code && code <= 0xc233) || // Lo  [27] HANGUL SYLLABLE SUG..HANGUL SYLLABLE SUH
    (0xc235 <= code && code <= 0xc24f) || // Lo  [27] HANGUL SYLLABLE SWEOG..HANGUL SYLLABLE SWEOH
    (0xc251 <= code && code <= 0xc26b) || // Lo  [27] HANGUL SYLLABLE SWEG..HANGUL SYLLABLE SWEH
    (0xc26d <= code && code <= 0xc287) || // Lo  [27] HANGUL SYLLABLE SWIG..HANGUL SYLLABLE SWIH
    (0xc289 <= code && code <= 0xc2a3) || // Lo  [27] HANGUL SYLLABLE SYUG..HANGUL SYLLABLE SYUH
    (0xc2a5 <= code && code <= 0xc2bf) || // Lo  [27] HANGUL SYLLABLE SEUG..HANGUL SYLLABLE SEUH
    (0xc2c1 <= code && code <= 0xc2db) || // Lo  [27] HANGUL SYLLABLE SYIG..HANGUL SYLLABLE SYIH
    (0xc2dd <= code && code <= 0xc2f7) || // Lo  [27] HANGUL SYLLABLE SIG..HANGUL SYLLABLE SIH
    (0xc2f9 <= code && code <= 0xc313) || // Lo  [27] HANGUL SYLLABLE SSAG..HANGUL SYLLABLE SSAH
    (0xc315 <= code && code <= 0xc32f) || // Lo  [27] HANGUL SYLLABLE SSAEG..HANGUL SYLLABLE SSAEH
    (0xc331 <= code && code <= 0xc34b) || // Lo  [27] HANGUL SYLLABLE SSYAG..HANGUL SYLLABLE SSYAH
    (0xc34d <= code && code <= 0xc367) || // Lo  [27] HANGUL SYLLABLE SSYAEG..HANGUL SYLLABLE SSYAEH
    (0xc369 <= code && code <= 0xc383) || // Lo  [27] HANGUL SYLLABLE SSEOG..HANGUL SYLLABLE SSEOH
    (0xc385 <= code && code <= 0xc39f) || // Lo  [27] HANGUL SYLLABLE SSEG..HANGUL SYLLABLE SSEH
    (0xc3a1 <= code && code <= 0xc3bb) || // Lo  [27] HANGUL SYLLABLE SSYEOG..HANGUL SYLLABLE SSYEOH
    (0xc3bd <= code && code <= 0xc3d7) || // Lo  [27] HANGUL SYLLABLE SSYEG..HANGUL SYLLABLE SSYEH
    (0xc3d9 <= code && code <= 0xc3f3) || // Lo  [27] HANGUL SYLLABLE SSOG..HANGUL SYLLABLE SSOH
    (0xc3f5 <= code && code <= 0xc40f) || // Lo  [27] HANGUL SYLLABLE SSWAG..HANGUL SYLLABLE SSWAH
    (0xc411 <= code && code <= 0xc42b) || // Lo  [27] HANGUL SYLLABLE SSWAEG..HANGUL SYLLABLE SSWAEH
    (0xc42d <= code && code <= 0xc447) || // Lo  [27] HANGUL SYLLABLE SSOEG..HANGUL SYLLABLE SSOEH
    (0xc449 <= code && code <= 0xc463) || // Lo  [27] HANGUL SYLLABLE SSYOG..HANGUL SYLLABLE SSYOH
    (0xc465 <= code && code <= 0xc47f) || // Lo  [27] HANGUL SYLLABLE SSUG..HANGUL SYLLABLE SSUH
    (0xc481 <= code && code <= 0xc49b) || // Lo  [27] HANGUL SYLLABLE SSWEOG..HANGUL SYLLABLE SSWEOH
    (0xc49d <= code && code <= 0xc4b7) || // Lo  [27] HANGUL SYLLABLE SSWEG..HANGUL SYLLABLE SSWEH
    (0xc4b9 <= code && code <= 0xc4d3) || // Lo  [27] HANGUL SYLLABLE SSWIG..HANGUL SYLLABLE SSWIH
    (0xc4d5 <= code && code <= 0xc4ef) || // Lo  [27] HANGUL SYLLABLE SSYUG..HANGUL SYLLABLE SSYUH
    (0xc4f1 <= code && code <= 0xc50b) || // Lo  [27] HANGUL SYLLABLE SSEUG..HANGUL SYLLABLE SSEUH
    (0xc50d <= code && code <= 0xc527) || // Lo  [27] HANGUL SYLLABLE SSYIG..HANGUL SYLLABLE SSYIH
    (0xc529 <= code && code <= 0xc543) || // Lo  [27] HANGUL SYLLABLE SSIG..HANGUL SYLLABLE SSIH
    (0xc545 <= code && code <= 0xc55f) || // Lo  [27] HANGUL SYLLABLE AG..HANGUL SYLLABLE AH
    (0xc561 <= code && code <= 0xc57b) || // Lo  [27] HANGUL SYLLABLE AEG..HANGUL SYLLABLE AEH
    (0xc57d <= code && code <= 0xc597) || // Lo  [27] HANGUL SYLLABLE YAG..HANGUL SYLLABLE YAH
    (0xc599 <= code && code <= 0xc5b3) || // Lo  [27] HANGUL SYLLABLE YAEG..HANGUL SYLLABLE YAEH
    (0xc5b5 <= code && code <= 0xc5cf) || // Lo  [27] HANGUL SYLLABLE EOG..HANGUL SYLLABLE EOH
    (0xc5d1 <= code && code <= 0xc5eb) || // Lo  [27] HANGUL SYLLABLE EG..HANGUL SYLLABLE EH
    (0xc5ed <= code && code <= 0xc607) || // Lo  [27] HANGUL SYLLABLE YEOG..HANGUL SYLLABLE YEOH
    (0xc609 <= code && code <= 0xc623) || // Lo  [27] HANGUL SYLLABLE YEG..HANGUL SYLLABLE YEH
    (0xc625 <= code && code <= 0xc63f) || // Lo  [27] HANGUL SYLLABLE OG..HANGUL SYLLABLE OH
    (0xc641 <= code && code <= 0xc65b) || // Lo  [27] HANGUL SYLLABLE WAG..HANGUL SYLLABLE WAH
    (0xc65d <= code && code <= 0xc677) || // Lo  [27] HANGUL SYLLABLE WAEG..HANGUL SYLLABLE WAEH
    (0xc679 <= code && code <= 0xc693) || // Lo  [27] HANGUL SYLLABLE OEG..HANGUL SYLLABLE OEH
    (0xc695 <= code && code <= 0xc6af) || // Lo  [27] HANGUL SYLLABLE YOG..HANGUL SYLLABLE YOH
    (0xc6b1 <= code && code <= 0xc6cb) || // Lo  [27] HANGUL SYLLABLE UG..HANGUL SYLLABLE UH
    (0xc6cd <= code && code <= 0xc6e7) || // Lo  [27] HANGUL SYLLABLE WEOG..HANGUL SYLLABLE WEOH
    (0xc6e9 <= code && code <= 0xc703) || // Lo  [27] HANGUL SYLLABLE WEG..HANGUL SYLLABLE WEH
    (0xc705 <= code && code <= 0xc71f) || // Lo  [27] HANGUL SYLLABLE WIG..HANGUL SYLLABLE WIH
    (0xc721 <= code && code <= 0xc73b) || // Lo  [27] HANGUL SYLLABLE YUG..HANGUL SYLLABLE YUH
    (0xc73d <= code && code <= 0xc757) || // Lo  [27] HANGUL SYLLABLE EUG..HANGUL SYLLABLE EUH
    (0xc759 <= code && code <= 0xc773) || // Lo  [27] HANGUL SYLLABLE YIG..HANGUL SYLLABLE YIH
    (0xc775 <= code && code <= 0xc78f) || // Lo  [27] HANGUL SYLLABLE IG..HANGUL SYLLABLE IH
    (0xc791 <= code && code <= 0xc7ab) || // Lo  [27] HANGUL SYLLABLE JAG..HANGUL SYLLABLE JAH
    (0xc7ad <= code && code <= 0xc7c7) || // Lo  [27] HANGUL SYLLABLE JAEG..HANGUL SYLLABLE JAEH
    (0xc7c9 <= code && code <= 0xc7e3) || // Lo  [27] HANGUL SYLLABLE JYAG..HANGUL SYLLABLE JYAH
    (0xc7e5 <= code && code <= 0xc7ff) || // Lo  [27] HANGUL SYLLABLE JYAEG..HANGUL SYLLABLE JYAEH
    (0xc801 <= code && code <= 0xc81b) || // Lo  [27] HANGUL SYLLABLE JEOG..HANGUL SYLLABLE JEOH
    (0xc81d <= code && code <= 0xc837) || // Lo  [27] HANGUL SYLLABLE JEG..HANGUL SYLLABLE JEH
    (0xc839 <= code && code <= 0xc853) || // Lo  [27] HANGUL SYLLABLE JYEOG..HANGUL SYLLABLE JYEOH
    (0xc855 <= code && code <= 0xc86f) || // Lo  [27] HANGUL SYLLABLE JYEG..HANGUL SYLLABLE JYEH
    (0xc871 <= code && code <= 0xc88b) || // Lo  [27] HANGUL SYLLABLE JOG..HANGUL SYLLABLE JOH
    (0xc88d <= code && code <= 0xc8a7) || // Lo  [27] HANGUL SYLLABLE JWAG..HANGUL SYLLABLE JWAH
    (0xc8a9 <= code && code <= 0xc8c3) || // Lo  [27] HANGUL SYLLABLE JWAEG..HANGUL SYLLABLE JWAEH
    (0xc8c5 <= code && code <= 0xc8df) || // Lo  [27] HANGUL SYLLABLE JOEG..HANGUL SYLLABLE JOEH
    (0xc8e1 <= code && code <= 0xc8fb) || // Lo  [27] HANGUL SYLLABLE JYOG..HANGUL SYLLABLE JYOH
    (0xc8fd <= code && code <= 0xc917) || // Lo  [27] HANGUL SYLLABLE JUG..HANGUL SYLLABLE JUH
    (0xc919 <= code && code <= 0xc933) || // Lo  [27] HANGUL SYLLABLE JWEOG..HANGUL SYLLABLE JWEOH
    (0xc935 <= code && code <= 0xc94f) || // Lo  [27] HANGUL SYLLABLE JWEG..HANGUL SYLLABLE JWEH
    (0xc951 <= code && code <= 0xc96b) || // Lo  [27] HANGUL SYLLABLE JWIG..HANGUL SYLLABLE JWIH
    (0xc96d <= code && code <= 0xc987) || // Lo  [27] HANGUL SYLLABLE JYUG..HANGUL SYLLABLE JYUH
    (0xc989 <= code && code <= 0xc9a3) || // Lo  [27] HANGUL SYLLABLE JEUG..HANGUL SYLLABLE JEUH
    (0xc9a5 <= code && code <= 0xc9bf) || // Lo  [27] HANGUL SYLLABLE JYIG..HANGUL SYLLABLE JYIH
    (0xc9c1 <= code && code <= 0xc9db) || // Lo  [27] HANGUL SYLLABLE JIG..HANGUL SYLLABLE JIH
    (0xc9dd <= code && code <= 0xc9f7) || // Lo  [27] HANGUL SYLLABLE JJAG..HANGUL SYLLABLE JJAH
    (0xc9f9 <= code && code <= 0xca13) || // Lo  [27] HANGUL SYLLABLE JJAEG..HANGUL SYLLABLE JJAEH
    (0xca15 <= code && code <= 0xca2f) || // Lo  [27] HANGUL SYLLABLE JJYAG..HANGUL SYLLABLE JJYAH
    (0xca31 <= code && code <= 0xca4b) || // Lo  [27] HANGUL SYLLABLE JJYAEG..HANGUL SYLLABLE JJYAEH
    (0xca4d <= code && code <= 0xca67) || // Lo  [27] HANGUL SYLLABLE JJEOG..HANGUL SYLLABLE JJEOH
    (0xca69 <= code && code <= 0xca83) || // Lo  [27] HANGUL SYLLABLE JJEG..HANGUL SYLLABLE JJEH
    (0xca85 <= code && code <= 0xca9f) || // Lo  [27] HANGUL SYLLABLE JJYEOG..HANGUL SYLLABLE JJYEOH
    (0xcaa1 <= code && code <= 0xcabb) || // Lo  [27] HANGUL SYLLABLE JJYEG..HANGUL SYLLABLE JJYEH
    (0xcabd <= code && code <= 0xcad7) || // Lo  [27] HANGUL SYLLABLE JJOG..HANGUL SYLLABLE JJOH
    (0xcad9 <= code && code <= 0xcaf3) || // Lo  [27] HANGUL SYLLABLE JJWAG..HANGUL SYLLABLE JJWAH
    (0xcaf5 <= code && code <= 0xcb0f) || // Lo  [27] HANGUL SYLLABLE JJWAEG..HANGUL SYLLABLE JJWAEH
    (0xcb11 <= code && code <= 0xcb2b) || // Lo  [27] HANGUL SYLLABLE JJOEG..HANGUL SYLLABLE JJOEH
    (0xcb2d <= code && code <= 0xcb47) || // Lo  [27] HANGUL SYLLABLE JJYOG..HANGUL SYLLABLE JJYOH
    (0xcb49 <= code && code <= 0xcb63) || // Lo  [27] HANGUL SYLLABLE JJUG..HANGUL SYLLABLE JJUH
    (0xcb65 <= code && code <= 0xcb7f) || // Lo  [27] HANGUL SYLLABLE JJWEOG..HANGUL SYLLABLE JJWEOH
    (0xcb81 <= code && code <= 0xcb9b) || // Lo  [27] HANGUL SYLLABLE JJWEG..HANGUL SYLLABLE JJWEH
    (0xcb9d <= code && code <= 0xcbb7) || // Lo  [27] HANGUL SYLLABLE JJWIG..HANGUL SYLLABLE JJWIH
    (0xcbb9 <= code && code <= 0xcbd3) || // Lo  [27] HANGUL SYLLABLE JJYUG..HANGUL SYLLABLE JJYUH
    (0xcbd5 <= code && code <= 0xcbef) || // Lo  [27] HANGUL SYLLABLE JJEUG..HANGUL SYLLABLE JJEUH
    (0xcbf1 <= code && code <= 0xcc0b) || // Lo  [27] HANGUL SYLLABLE JJYIG..HANGUL SYLLABLE JJYIH
    (0xcc0d <= code && code <= 0xcc27) || // Lo  [27] HANGUL SYLLABLE JJIG..HANGUL SYLLABLE JJIH
    (0xcc29 <= code && code <= 0xcc43) || // Lo  [27] HANGUL SYLLABLE CAG..HANGUL SYLLABLE CAH
    (0xcc45 <= code && code <= 0xcc5f) || // Lo  [27] HANGUL SYLLABLE CAEG..HANGUL SYLLABLE CAEH
    (0xcc61 <= code && code <= 0xcc7b) || // Lo  [27] HANGUL SYLLABLE CYAG..HANGUL SYLLABLE CYAH
    (0xcc7d <= code && code <= 0xcc97) || // Lo  [27] HANGUL SYLLABLE CYAEG..HANGUL SYLLABLE CYAEH
    (0xcc99 <= code && code <= 0xccb3) || // Lo  [27] HANGUL SYLLABLE CEOG..HANGUL SYLLABLE CEOH
    (0xccb5 <= code && code <= 0xcccf) || // Lo  [27] HANGUL SYLLABLE CEG..HANGUL SYLLABLE CEH
    (0xccd1 <= code && code <= 0xcceb) || // Lo  [27] HANGUL SYLLABLE CYEOG..HANGUL SYLLABLE CYEOH
    (0xcced <= code && code <= 0xcd07) || // Lo  [27] HANGUL SYLLABLE CYEG..HANGUL SYLLABLE CYEH
    (0xcd09 <= code && code <= 0xcd23) || // Lo  [27] HANGUL SYLLABLE COG..HANGUL SYLLABLE COH
    (0xcd25 <= code && code <= 0xcd3f) || // Lo  [27] HANGUL SYLLABLE CWAG..HANGUL SYLLABLE CWAH
    (0xcd41 <= code && code <= 0xcd5b) || // Lo  [27] HANGUL SYLLABLE CWAEG..HANGUL SYLLABLE CWAEH
    (0xcd5d <= code && code <= 0xcd77) || // Lo  [27] HANGUL SYLLABLE COEG..HANGUL SYLLABLE COEH
    (0xcd79 <= code && code <= 0xcd93) || // Lo  [27] HANGUL SYLLABLE CYOG..HANGUL SYLLABLE CYOH
    (0xcd95 <= code && code <= 0xcdaf) || // Lo  [27] HANGUL SYLLABLE CUG..HANGUL SYLLABLE CUH
    (0xcdb1 <= code && code <= 0xcdcb) || // Lo  [27] HANGUL SYLLABLE CWEOG..HANGUL SYLLABLE CWEOH
    (0xcdcd <= code && code <= 0xcde7) || // Lo  [27] HANGUL SYLLABLE CWEG..HANGUL SYLLABLE CWEH
    (0xcde9 <= code && code <= 0xce03) || // Lo  [27] HANGUL SYLLABLE CWIG..HANGUL SYLLABLE CWIH
    (0xce05 <= code && code <= 0xce1f) || // Lo  [27] HANGUL SYLLABLE CYUG..HANGUL SYLLABLE CYUH
    (0xce21 <= code && code <= 0xce3b) || // Lo  [27] HANGUL SYLLABLE CEUG..HANGUL SYLLABLE CEUH
    (0xce3d <= code && code <= 0xce57) || // Lo  [27] HANGUL SYLLABLE CYIG..HANGUL SYLLABLE CYIH
    (0xce59 <= code && code <= 0xce73) || // Lo  [27] HANGUL SYLLABLE CIG..HANGUL SYLLABLE CIH
    (0xce75 <= code && code <= 0xce8f) || // Lo  [27] HANGUL SYLLABLE KAG..HANGUL SYLLABLE KAH
    (0xce91 <= code && code <= 0xceab) || // Lo  [27] HANGUL SYLLABLE KAEG..HANGUL SYLLABLE KAEH
    (0xcead <= code && code <= 0xcec7) || // Lo  [27] HANGUL SYLLABLE KYAG..HANGUL SYLLABLE KYAH
    (0xcec9 <= code && code <= 0xcee3) || // Lo  [27] HANGUL SYLLABLE KYAEG..HANGUL SYLLABLE KYAEH
    (0xcee5 <= code && code <= 0xceff) || // Lo  [27] HANGUL SYLLABLE KEOG..HANGUL SYLLABLE KEOH
    (0xcf01 <= code && code <= 0xcf1b) || // Lo  [27] HANGUL SYLLABLE KEG..HANGUL SYLLABLE KEH
    (0xcf1d <= code && code <= 0xcf37) || // Lo  [27] HANGUL SYLLABLE KYEOG..HANGUL SYLLABLE KYEOH
    (0xcf39 <= code && code <= 0xcf53) || // Lo  [27] HANGUL SYLLABLE KYEG..HANGUL SYLLABLE KYEH
    (0xcf55 <= code && code <= 0xcf6f) || // Lo  [27] HANGUL SYLLABLE KOG..HANGUL SYLLABLE KOH
    (0xcf71 <= code && code <= 0xcf8b) || // Lo  [27] HANGUL SYLLABLE KWAG..HANGUL SYLLABLE KWAH
    (0xcf8d <= code && code <= 0xcfa7) || // Lo  [27] HANGUL SYLLABLE KWAEG..HANGUL SYLLABLE KWAEH
    (0xcfa9 <= code && code <= 0xcfc3) || // Lo  [27] HANGUL SYLLABLE KOEG..HANGUL SYLLABLE KOEH
    (0xcfc5 <= code && code <= 0xcfdf) || // Lo  [27] HANGUL SYLLABLE KYOG..HANGUL SYLLABLE KYOH
    (0xcfe1 <= code && code <= 0xcffb) || // Lo  [27] HANGUL SYLLABLE KUG..HANGUL SYLLABLE KUH
    (0xcffd <= code && code <= 0xd017) || // Lo  [27] HANGUL SYLLABLE KWEOG..HANGUL SYLLABLE KWEOH
    (0xd019 <= code && code <= 0xd033) || // Lo  [27] HANGUL SYLLABLE KWEG..HANGUL SYLLABLE KWEH
    (0xd035 <= code && code <= 0xd04f) || // Lo  [27] HANGUL SYLLABLE KWIG..HANGUL SYLLABLE KWIH
    (0xd051 <= code && code <= 0xd06b) || // Lo  [27] HANGUL SYLLABLE KYUG..HANGUL SYLLABLE KYUH
    (0xd06d <= code && code <= 0xd087) || // Lo  [27] HANGUL SYLLABLE KEUG..HANGUL SYLLABLE KEUH
    (0xd089 <= code && code <= 0xd0a3) || // Lo  [27] HANGUL SYLLABLE KYIG..HANGUL SYLLABLE KYIH
    (0xd0a5 <= code && code <= 0xd0bf) || // Lo  [27] HANGUL SYLLABLE KIG..HANGUL SYLLABLE KIH
    (0xd0c1 <= code && code <= 0xd0db) || // Lo  [27] HANGUL SYLLABLE TAG..HANGUL SYLLABLE TAH
    (0xd0dd <= code && code <= 0xd0f7) || // Lo  [27] HANGUL SYLLABLE TAEG..HANGUL SYLLABLE TAEH
    (0xd0f9 <= code && code <= 0xd113) || // Lo  [27] HANGUL SYLLABLE TYAG..HANGUL SYLLABLE TYAH
    (0xd115 <= code && code <= 0xd12f) || // Lo  [27] HANGUL SYLLABLE TYAEG..HANGUL SYLLABLE TYAEH
    (0xd131 <= code && code <= 0xd14b) || // Lo  [27] HANGUL SYLLABLE TEOG..HANGUL SYLLABLE TEOH
    (0xd14d <= code && code <= 0xd167) || // Lo  [27] HANGUL SYLLABLE TEG..HANGUL SYLLABLE TEH
    (0xd169 <= code && code <= 0xd183) || // Lo  [27] HANGUL SYLLABLE TYEOG..HANGUL SYLLABLE TYEOH
    (0xd185 <= code && code <= 0xd19f) || // Lo  [27] HANGUL SYLLABLE TYEG..HANGUL SYLLABLE TYEH
    (0xd1a1 <= code && code <= 0xd1bb) || // Lo  [27] HANGUL SYLLABLE TOG..HANGUL SYLLABLE TOH
    (0xd1bd <= code && code <= 0xd1d7) || // Lo  [27] HANGUL SYLLABLE TWAG..HANGUL SYLLABLE TWAH
    (0xd1d9 <= code && code <= 0xd1f3) || // Lo  [27] HANGUL SYLLABLE TWAEG..HANGUL SYLLABLE TWAEH
    (0xd1f5 <= code && code <= 0xd20f) || // Lo  [27] HANGUL SYLLABLE TOEG..HANGUL SYLLABLE TOEH
    (0xd211 <= code && code <= 0xd22b) || // Lo  [27] HANGUL SYLLABLE TYOG..HANGUL SYLLABLE TYOH
    (0xd22d <= code && code <= 0xd247) || // Lo  [27] HANGUL SYLLABLE TUG..HANGUL SYLLABLE TUH
    (0xd249 <= code && code <= 0xd263) || // Lo  [27] HANGUL SYLLABLE TWEOG..HANGUL SYLLABLE TWEOH
    (0xd265 <= code && code <= 0xd27f) || // Lo  [27] HANGUL SYLLABLE TWEG..HANGUL SYLLABLE TWEH
    (0xd281 <= code && code <= 0xd29b) || // Lo  [27] HANGUL SYLLABLE TWIG..HANGUL SYLLABLE TWIH
    (0xd29d <= code && code <= 0xd2b7) || // Lo  [27] HANGUL SYLLABLE TYUG..HANGUL SYLLABLE TYUH
    (0xd2b9 <= code && code <= 0xd2d3) || // Lo  [27] HANGUL SYLLABLE TEUG..HANGUL SYLLABLE TEUH
    (0xd2d5 <= code && code <= 0xd2ef) || // Lo  [27] HANGUL SYLLABLE TYIG..HANGUL SYLLABLE TYIH
    (0xd2f1 <= code && code <= 0xd30b) || // Lo  [27] HANGUL SYLLABLE TIG..HANGUL SYLLABLE TIH
    (0xd30d <= code && code <= 0xd327) || // Lo  [27] HANGUL SYLLABLE PAG..HANGUL SYLLABLE PAH
    (0xd329 <= code && code <= 0xd343) || // Lo  [27] HANGUL SYLLABLE PAEG..HANGUL SYLLABLE PAEH
    (0xd345 <= code && code <= 0xd35f) || // Lo  [27] HANGUL SYLLABLE PYAG..HANGUL SYLLABLE PYAH
    (0xd361 <= code && code <= 0xd37b) || // Lo  [27] HANGUL SYLLABLE PYAEG..HANGUL SYLLABLE PYAEH
    (0xd37d <= code && code <= 0xd397) || // Lo  [27] HANGUL SYLLABLE PEOG..HANGUL SYLLABLE PEOH
    (0xd399 <= code && code <= 0xd3b3) || // Lo  [27] HANGUL SYLLABLE PEG..HANGUL SYLLABLE PEH
    (0xd3b5 <= code && code <= 0xd3cf) || // Lo  [27] HANGUL SYLLABLE PYEOG..HANGUL SYLLABLE PYEOH
    (0xd3d1 <= code && code <= 0xd3eb) || // Lo  [27] HANGUL SYLLABLE PYEG..HANGUL SYLLABLE PYEH
    (0xd3ed <= code && code <= 0xd407) || // Lo  [27] HANGUL SYLLABLE POG..HANGUL SYLLABLE POH
    (0xd409 <= code && code <= 0xd423) || // Lo  [27] HANGUL SYLLABLE PWAG..HANGUL SYLLABLE PWAH
    (0xd425 <= code && code <= 0xd43f) || // Lo  [27] HANGUL SYLLABLE PWAEG..HANGUL SYLLABLE PWAEH
    (0xd441 <= code && code <= 0xd45b) || // Lo  [27] HANGUL SYLLABLE POEG..HANGUL SYLLABLE POEH
    (0xd45d <= code && code <= 0xd477) || // Lo  [27] HANGUL SYLLABLE PYOG..HANGUL SYLLABLE PYOH
    (0xd479 <= code && code <= 0xd493) || // Lo  [27] HANGUL SYLLABLE PUG..HANGUL SYLLABLE PUH
    (0xd495 <= code && code <= 0xd4af) || // Lo  [27] HANGUL SYLLABLE PWEOG..HANGUL SYLLABLE PWEOH
    (0xd4b1 <= code && code <= 0xd4cb) || // Lo  [27] HANGUL SYLLABLE PWEG..HANGUL SYLLABLE PWEH
    (0xd4cd <= code && code <= 0xd4e7) || // Lo  [27] HANGUL SYLLABLE PWIG..HANGUL SYLLABLE PWIH
    (0xd4e9 <= code && code <= 0xd503) || // Lo  [27] HANGUL SYLLABLE PYUG..HANGUL SYLLABLE PYUH
    (0xd505 <= code && code <= 0xd51f) || // Lo  [27] HANGUL SYLLABLE PEUG..HANGUL SYLLABLE PEUH
    (0xd521 <= code && code <= 0xd53b) || // Lo  [27] HANGUL SYLLABLE PYIG..HANGUL SYLLABLE PYIH
    (0xd53d <= code && code <= 0xd557) || // Lo  [27] HANGUL SYLLABLE PIG..HANGUL SYLLABLE PIH
    (0xd559 <= code && code <= 0xd573) || // Lo  [27] HANGUL SYLLABLE HAG..HANGUL SYLLABLE HAH
    (0xd575 <= code && code <= 0xd58f) || // Lo  [27] HANGUL SYLLABLE HAEG..HANGUL SYLLABLE HAEH
    (0xd591 <= code && code <= 0xd5ab) || // Lo  [27] HANGUL SYLLABLE HYAG..HANGUL SYLLABLE HYAH
    (0xd5ad <= code && code <= 0xd5c7) || // Lo  [27] HANGUL SYLLABLE HYAEG..HANGUL SYLLABLE HYAEH
    (0xd5c9 <= code && code <= 0xd5e3) || // Lo  [27] HANGUL SYLLABLE HEOG..HANGUL SYLLABLE HEOH
    (0xd5e5 <= code && code <= 0xd5ff) || // Lo  [27] HANGUL SYLLABLE HEG..HANGUL SYLLABLE HEH
    (0xd601 <= code && code <= 0xd61b) || // Lo  [27] HANGUL SYLLABLE HYEOG..HANGUL SYLLABLE HYEOH
    (0xd61d <= code && code <= 0xd637) || // Lo  [27] HANGUL SYLLABLE HYEG..HANGUL SYLLABLE HYEH
    (0xd639 <= code && code <= 0xd653) || // Lo  [27] HANGUL SYLLABLE HOG..HANGUL SYLLABLE HOH
    (0xd655 <= code && code <= 0xd66f) || // Lo  [27] HANGUL SYLLABLE HWAG..HANGUL SYLLABLE HWAH
    (0xd671 <= code && code <= 0xd68b) || // Lo  [27] HANGUL SYLLABLE HWAEG..HANGUL SYLLABLE HWAEH
    (0xd68d <= code && code <= 0xd6a7) || // Lo  [27] HANGUL SYLLABLE HOEG..HANGUL SYLLABLE HOEH
    (0xd6a9 <= code && code <= 0xd6c3) || // Lo  [27] HANGUL SYLLABLE HYOG..HANGUL SYLLABLE HYOH
    (0xd6c5 <= code && code <= 0xd6df) || // Lo  [27] HANGUL SYLLABLE HUG..HANGUL SYLLABLE HUH
    (0xd6e1 <= code && code <= 0xd6fb) || // Lo  [27] HANGUL SYLLABLE HWEOG..HANGUL SYLLABLE HWEOH
    (0xd6fd <= code && code <= 0xd717) || // Lo  [27] HANGUL SYLLABLE HWEG..HANGUL SYLLABLE HWEH
    (0xd719 <= code && code <= 0xd733) || // Lo  [27] HANGUL SYLLABLE HWIG..HANGUL SYLLABLE HWIH
    (0xd735 <= code && code <= 0xd74f) || // Lo  [27] HANGUL SYLLABLE HYUG..HANGUL SYLLABLE HYUH
    (0xd751 <= code && code <= 0xd76b) || // Lo  [27] HANGUL SYLLABLE HEUG..HANGUL SYLLABLE HEUH
    (0xd76d <= code && code <= 0xd787) || // Lo  [27] HANGUL SYLLABLE HYIG..HANGUL SYLLABLE HYIH
    (0xd789 <= code && code <= 0xd7a3) // Lo  [27] HANGUL SYLLABLE HIG..HANGUL SYLLABLE HIH
  ) {
    return LVT
  }

  if (
    code == 0x261d || // So       WHITE UP POINTING INDEX
    code == 0x26f9 || // So       PERSON WITH BALL
    (0x270a <= code && code <= 0x270d) || // So   [4] RAISED FIST..WRITING HAND
    code == 0x1f385 || // So       FATHER CHRISTMAS
    (0x1f3c2 <= code && code <= 0x1f3c4) || // So   [3] SNOWBOARDER..SURFER
    code == 0x1f3c7 || // So       HORSE RACING
    (0x1f3ca <= code && code <= 0x1f3cc) || // So   [3] SWIMMER..GOLFER
    (0x1f442 <= code && code <= 0x1f443) || // So   [2] EAR..NOSE
    (0x1f446 <= code && code <= 0x1f450) || // So  [11] WHITE UP POINTING BACKHAND INDEX..OPEN HANDS SIGN
    code == 0x1f46e || // So       POLICE OFFICER
    (0x1f470 <= code && code <= 0x1f478) || // So   [9] BRIDE WITH VEIL..PRINCESS
    code == 0x1f47c || // So       BABY ANGEL
    (0x1f481 <= code && code <= 0x1f483) || // So   [3] INFORMATION DESK PERSON..DANCER
    (0x1f485 <= code && code <= 0x1f487) || // So   [3] NAIL POLISH..HAIRCUT
    code == 0x1f4aa || // So       FLEXED BICEPS
    (0x1f574 <= code && code <= 0x1f575) || // So   [2] MAN IN BUSINESS SUIT LEVITATING..SLEUTH OR SPY
    code == 0x1f57a || // So       MAN DANCING
    code == 0x1f590 || // So       RAISED HAND WITH FINGERS SPLAYED
    (0x1f595 <= code && code <= 0x1f596) || // So   [2] REVERSED HAND WITH MIDDLE FINGER EXTENDED..RAISED HAND WITH PART BETWEEN MIDDLE AND RING FINGERS
    (0x1f645 <= code && code <= 0x1f647) || // So   [3] FACE WITH NO GOOD GESTURE..PERSON BOWING DEEPLY
    (0x1f64b <= code && code <= 0x1f64f) || // So   [5] HAPPY PERSON RAISING ONE HAND..PERSON WITH FOLDED HANDS
    code == 0x1f6a3 || // So       ROWBOAT
    (0x1f6b4 <= code && code <= 0x1f6b6) || // So   [3] BICYCLIST..PEDESTRIAN
    code == 0x1f6c0 || // So       BATH
    code == 0x1f6cc || // So       SLEEPING ACCOMMODATION
    (0x1f918 <= code && code <= 0x1f91c) || // So   [5] SIGN OF THE HORNS..RIGHT-FACING FIST
    (0x1f91e <= code && code <= 0x1f91f) || // So   [2] HAND WITH INDEX AND MIDDLE FINGERS CROSSED..I LOVE YOU HAND SIGN
    code == 0x1f926 || // So       FACE PALM
    (0x1f930 <= code && code <= 0x1f939) || // So  [10] PREGNANT WOMAN..JUGGLING
    (0x1f93d <= code && code <= 0x1f93e) || // So   [2] WATER POLO..HANDBALL
    (0x1f9d1 <= code && code <= 0x1f9dd) // So  [13] ADULT..ELF
  ) {
    return EBase
  }

  if (
    0x1f3fb <= code &&
    code <= 0x1f3ff // Sk   [5] EMOJI MODIFIER FITZPATRICK TYPE-1-2..EMOJI MODIFIER FITZPATRICK TYPE-6
  ) {
    return EModifier
  }

  if (
    code == 0x200d // Cf       ZERO WIDTH JOINER
  ) {
    return ZWJ
  }

  if (
    code == 0x2640 || // So       FEMALE SIGN
    code == 0x2642 || // So       MALE SIGN
    (0x2695 <= code && code <= 0x2696) || // So   [2] STAFF OF AESCULAPIUS..SCALES
    code == 0x2708 || // So       AIRPLANE
    code == 0x2764 || // So       HEAVY BLACK HEART
    code == 0x1f308 || // So       RAINBOW
    code == 0x1f33e || // So       EAR OF RICE
    code == 0x1f373 || // So       COOKING
    code == 0x1f393 || // So       GRADUATION CAP
    code == 0x1f3a4 || // So       MICROPHONE
    code == 0x1f3a8 || // So       ARTIST PALETTE
    code == 0x1f3eb || // So       SCHOOL
    code == 0x1f3ed || // So       FACTORY
    code == 0x1f48b || // So       KISS MARK
    (0x1f4bb <= code && code <= 0x1f4bc) || // So   [2] PERSONAL COMPUTER..BRIEFCASE
    code == 0x1f527 || // So       WRENCH
    code == 0x1f52c || // So       MICROSCOPE
    code == 0x1f5e8 || // So       LEFT SPEECH BUBBLE
    code == 0x1f680 || // So       ROCKET
    code == 0x1f692 // So       FIRE ENGINE
  ) {
    return GlueAfterZwj
  }

  if (
    0x1f466 <= code &&
    code <= 0x1f469 // So   [4] BOY..WOMAN
  ) {
    return EBaseGAZ
  }

  // all unlisted characters have a grapheme break property of "Other"
  return Other
}
