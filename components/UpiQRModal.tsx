import React from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

interface IUpiPros { 
    visible : boolean, 
    onClose : ()=>void, 
    upiId : string, 
    payeeName : string, 
    amount : string
 }

const UpiQRModal = ({ visible, onClose, upiId, payeeName, amount } : IUpiPros) => {
  const upiUrl = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(
    payeeName
  )}&am=${amount}&cu=INR`;

  return (
    <Modal
      transparent
      animationType="fade"
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <Text style={styles.title}>Scan to Pay</Text>

          <QRCode value={upiUrl} size={200} />

          <Text style={styles.amountText}>{amount}</Text>
          <Text style={styles.upiText}>UPI ID: {upiId}</Text>

          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

export default UpiQRModal;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    elevation: 5,
    width: '80%',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  amountText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '500',
  },
  upiText: {
    fontSize: 14,
    color: '#555',
    marginTop: 4,
  },
  closeButton: {
    marginTop: 20,
    backgroundColor: '#000',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  closeButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
});
