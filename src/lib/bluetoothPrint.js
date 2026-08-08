// lib/bluetoothPrint.js

export const printViaBluetooth = async (cart, tableNum, orderType) => {
  try {
    // 1. Demande d'accès
    const device = await navigator.bluetooth.requestDevice({
      filters: [{ services: ['000018f0-0000-1000-8000-00805f9b34fb'] }],
      optionalServices: ['000018f0-0000-1000-8000-00805f9b34fb']
    });

    const server = await device.gatt.connect();
    const service = await server.getPrimaryService('000018f0-0000-1000-8000-00805f9b34fb');
    const characteristic = await service.getCharacteristic('00002af1-0000-1000-8000-00805f9b34fb');

    const encoder = new TextEncoder();
    
    // Commandes ESC/POS
    const INIT = '\x1B\x40';
    const CENTER = '\x1B\x61\x01';
    const LEFT = '\x1B\x61\x00';
    const BOLD_ON = '\x1B\x45\x01';
    const BOLD_OFF = '\x1B\x45\x00';
    const DOUBLE_SIZE = '\x1D\x21\x11'; // Texte plus gros pour le titre
    const NORMAL_SIZE = '\x1D\x21\x00';

    let cmds = INIT + CENTER + BOLD_ON + DOUBLE_SIZE + "COMPTOIR\n" + NORMAL_SIZE;
    cmds += "NOTE PROVISOIRE\n";
    cmds += `Table: ${tableNum || 'Comptoir'}\n`;
    cmds += "--------------------------------\n" + LEFT + BOLD_OFF;

    cart.forEach(item => {
      // Formater la ligne : "1x Nom du plat      5000 F"
      const name = item.name.substring(0, 18);
      const price = (item.price * item.quantity).toString() + " F";
      const spaces = " ".repeat(32 - (item.quantity.toString().length + 2 + name.length + price.length));
      cmds += `${item.quantity}x ${name}${spaces}${price}\n`;
    });

    const total = cart.reduce((a, b) => a + (b.price * b.quantity), 0);
    const totalFormatte = total.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");


    cmds += "--------------------------------\n" + CENTER + BOLD_ON;
    cmds += `TOTAL: ${totalFormatte} F\n`;
    cmds += BOLD_OFF + "\nMerci de votre confiance !\n\n\n\n";

    const bytes = encoder.encode(cmds);
    
    
    for (let i = 0; i < bytes.length; i += 20) {
      await characteristic.writeValue(bytes.slice(i, i + 20));
    }

    return true;
  } catch (error) {
    console.error("Erreur d'impression Bluetooth:", error);
    throw error;
  }
};