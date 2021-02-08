const { memory } = just.library('memory', '../../just-js/modules/memory/memory.so')

function compileBPF (prog, littleEndian = true) {
  const len = prog.length
  const bpf = new ArrayBuffer(len * 8)
  const dv = new DataView(bpf)
  let off = 0
  for (let i = 0; i < len; i++) {
    dv.setUint16(off, prog[i][0], littleEndian)
    dv.setUint8(off + 2, prog[i][1])
    dv.setUint8(off + 3, prog[i][2])
    dv.setUint32(off + 4, prog[i][3], littleEndian)
    off += 8
  }
  return bpf
}

function compile (prog, littleEndian = true) {
  const bpf = compileBPF(prog, littleEndian)
  const buf = new ArrayBuffer(16)
  const dv = new DataView(buf)
  dv.setUint16(0, prog.length, littleEndian)
  memory.writePointer(memory.rawBuffer(buf), 8, memory.rawBuffer(bpf))
  buf.bpf = bpf
  return buf
}

const BPF_LD = 0x00
const BPF_H = 0x08
const BPF_ABS = 0x20
const BPF_B = 0x10
const BPF_JEQ = 0x10
const BPF_JMP = 0x05
const BPF_K = 0x00
const BPF_RET = 0x06

const OP_LDH = (BPF_LD | BPF_H | BPF_ABS)
const OP_LDB = (BPF_LD | BPF_B | BPF_ABS)
const OP_JEQ = (BPF_JMP | BPF_JEQ | BPF_K)
const OP_RET = (BPF_RET | BPF_K)

const if_ether = {
  ETH_P_LOOP: 0x0060, // Ethernet Loopback packet
  ETH_P_PUP: 0x0200, // Xerox PUP packet
  ETH_P_PUPAT: 0x0201, // Xerox PUP Addr Trans packet
  ETH_P_TSN: 0x22F0, // TSN (IEEE 1722) packet
  ETH_P_ERSPAN2: 0x22EB, // ERSPAN version 2 (type III)
  ETH_P_IP: 0x0800, // Internet Protocol packet
  ETH_P_X25: 0x0805, // CCITT X.25
  ETH_P_ARP: 0x0806, // Address Resolution packet
  ETH_P_BPQ: 0x08FF, // G8BPQ AX.25 Ethernet Packet [ NOT AN OFFICIALLY REGISTERED ID ]
  ETH_P_IEEEPUP: 0x0a00, // Xerox IEEE802.3 PUP packet
  ETH_P_IEEEPUPAT: 0x0a01, // Xerox IEEE802.3 PUP Addr Trans packet
  ETH_P_BATMAN: 0x4305, // B.A.T.M.A.N.-Advanced packet [ NOT AN OFFICIALLY REGISTERED ID ]
  ETH_P_DEC: 0x6000, // DEC Assigned proto
  ETH_P_DNA_DL: 0x6001, // DEC DNA Dump/Load
  ETH_P_DNA_RC: 0x6002, // DEC DNA Remote Console
  ETH_P_DNA_RT: 0x6003, // DEC DNA Routing
  ETH_P_LAT: 0x6004, // DEC LAT
  ETH_P_DIAG: 0x6005, // DEC Diagnostics
  ETH_P_CUST: 0x6006, // DEC Customer use
  ETH_P_SCA: 0x6007, // DEC Systems Comms Arch
  ETH_P_TEB: 0x6558, // Trans Ether Bridging
  ETH_P_RARP: 0x8035, // Reverse Addr Res packet
  ETH_P_ATALK: 0x809B, // Appletalk DDP
  ETH_P_AARP: 0x80F3, // Appletalk AARP
  ETH_P_8021Q: 0x8100, // 802.1Q VLAN Extended Header
  ETH_P_ERSPAN: 0x88BE, // ERSPAN type II
  ETH_P_IPX: 0x8137, // IPX over DIX
  ETH_P_IPV6: 0x86DD, // IPv6 over bluebook
  ETH_P_PAUSE: 0x8808, // IEEE Pause frames. See 802.3 31B
  ETH_P_SLOW: 0x8809, // Slow Protocol. See 802.3ad 43B
  ETH_P_WCCP: 0x883E, // Web-cache coordination protocol defined in draft-wilson-wrec-wccp-v2-00.txt
  ETH_P_MPLS_UC: 0x8847, // MPLS Unicast traffic
  ETH_P_MPLS_MC: 0x8848, // MPLS Multicast traffic
  ETH_P_ATMMPOA: 0x884c, // MultiProtocol Over ATM
  ETH_P_PPP_DISC: 0x8863, // PPPoE discovery messages
  ETH_P_PPP_SES: 0x8864, // PPPoE session messages
  ETH_P_LINK_CTL: 0x886c, // HPNA, wlan link local tunnel
  ETH_P_ATMFATE: 0x8884, // Frame-based ATM Transport over Ethernet
  ETH_P_PAE: 0x888E, // Port Access Entity (IEEE 802.1X)
  ETH_P_AOE: 0x88A2, // ATA over Ethernet
  ETH_P_8021AD: 0x88A8, // 802.1ad Service VLAN
  ETH_P_802_EX1: 0x88B5, // 802.1 Local Experimental 1.
  ETH_P_PREAUTH: 0x88C7, // 802.11 Preauthentication
  ETH_P_TIPC: 0x88CA, // TIPC
  ETH_P_LLDP: 0x88CC, // Link Layer Discovery Protocol
  ETH_P_MACSEC: 0x88E5, // 802.1ae MACsec
  ETH_P_8021AH: 0x88E7, // 802.1ah Backbone Service Tag
  ETH_P_MVRP: 0x88F5, // 802.1Q MVRP
  ETH_P_1588: 0x88F7, // IEEE 1588 Timesync
  ETH_P_NCSI: 0x88F8, // NCSI protocol
  ETH_P_PRP: 0x88FB, // IEC 62439-3 PRP/HSRv0
  ETH_P_FCOE: 0x8906, // Fibre Channel over Ethernet
  ETH_P_IBOE: 0x8915, // Infiniband over Ethernet
  ETH_P_TDLS: 0x890D, // TDLS
  ETH_P_FIP: 0x8914, // FCoE Initialization Protocol
  ETH_P_80221: 0x8917, // IEEE 802.21 Media Independent Handover Protocol
  ETH_P_HSR: 0x892F, // IEC 62439-3 HSRv1
  ETH_P_NSH: 0x894F, // Network Service Header
  ETH_P_LOOPBACK: 0x9000, // Ethernet loopback packet, per IEEE 802.3
  ETH_P_QINQ1: 0x9100, // deprecated QinQ VLAN [ NOT AN OFFICIALLY REGISTERED ID ]
  ETH_P_QINQ2: 0x9200, // deprecated QinQ VLAN [ NOT AN OFFICIALLY REGISTERED ID ]
  ETH_P_QINQ3: 0x9300, // deprecated QinQ VLAN [ NOT AN OFFICIALLY REGISTERED ID ]
  ETH_P_EDSA: 0xDADA, // Ethertype DSA [ NOT AN OFFICIALLY REGISTERED ID ]
  ETH_P_DSA_8021Q: 0xDADB, // Fake VLAN Header for DSA [ NOT AN OFFICIALLY REGISTERED ID ]
  ETH_P_IFE: 0xED3E, // ForCES inter-FE LFB type
  ETH_P_AF_IUCV: 0xFBFB, // IBM af_iucv [ NOT AN OFFICIALLY REGISTERED ID ]
  ETH_P_802_3_MIN: 0x0600 // If the value in the ethernet type is less than this value then the frame is Ethernet II. Else it is 802.3
}

module.exports = { compile, OP_LDH, OP_LDB, OP_JEQ, OP_RET, if_ether }
