import React, { useEffect, useState } from 'react';
import { Alert, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

interface IUpiPros {
  visible: boolean,
  onClose: () => void,
  upiId: string,
  payeeName: string,
  amount: string
}

const UpiQRModal = ({ visible, onClose, upiId, payeeName, amount }: IUpiPros) => {
  const [qrValue, setQrValue] = useState<string>('');
  const [isQrReady, setIsQrReady] = useState<boolean>(false);

  useEffect(() => {
    if (visible && upiId && payeeName && amount) {
      try {
        const upiUrl = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(
          payeeName
        )}&am=${amount}&cu=INR`;
        setQrValue(upiUrl);
        setIsQrReady(true);
      } catch (error) {
        console.error('Error generating UPI URL:', error);
        Alert.alert('Error', 'Failed to generate QR code');
        onClose();
      }
    }
  }, [visible, upiId, payeeName, amount]);

  const handleClose = () => {
    setIsQrReady(false);
    setQrValue('');
    onClose();
  };

  return (
    <Modal
      transparent
      animationType="fade"
      visible={visible}
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <Text style={styles.title}>Scan to Pay</Text>

          {isQrReady && qrValue ? (
            <QRCode 
              value={qrValue} 
              size={200}
              onError={(error : any) => {
                console.error('QR Code generation error:', error);
                Alert.alert('Error', 'Failed to generate QR code');
                handleClose();
              }}
            />
          ) : (
            <View style={styles.qrPlaceholder}>
              <Text style={styles.loadingText}>Generating QR Code...</Text>
            </View>
          )}

          <Text style={styles.amountText}>{amount}</Text>
          <Text style={styles.upiText}>UPI ID: {upiId}</Text>

          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
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
  qrPlaceholder: {
    width: 200,
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  loadingText: {
    fontSize: 14,
    color: '#666',
  },
});
