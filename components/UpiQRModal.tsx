import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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
  const [qrError, setQrError] = useState<boolean>(false);

  const generateUPIUrl = () => {
    try {
      // Clean the amount string to remove currency symbols and commas
      const cleanAmount = amount.replace(/[₹,]/g, '');
      const numericAmount = parseFloat(cleanAmount);

      if (isNaN(numericAmount) || numericAmount <= 0) {
        console.error('Invalid or non-positive amount for QR code:', amount);
        return null;
      }

      const upiUrl = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(payeeName)}&am=${numericAmount.toFixed(2)}&cu=INR`;
      return upiUrl;
    } catch (error) {
      console.error('Error generating UPI URL:', error);
      return null;
    }
  };

  const generateQrCode = () => {
    if (!upiId || !payeeName || !amount) {
      setQrError(true);
      setIsQrReady(false);
      return;
    }

    const upiUrl = generateUPIUrl();
    if (upiUrl) {
      setQrValue(upiUrl);
      setIsQrReady(true);
      setQrError(false);
    } else {
      setQrError(true);
      setIsQrReady(false);
    }
  };

  useEffect(() => {
    if (visible) {
      generateQrCode();
    } else {
      // Reset state when modal is closed to avoid showing stale data
      setIsQrReady(false);
      setQrValue('');
      setQrError(false);
    }
  }, [visible, upiId, payeeName, amount]);

  const handleClose = () => {
    onClose();
  };

  const handleQRError = (error: any) => {
    console.error('QR Code generation error:', error);
    setQrError(true);
    setIsQrReady(false);
  };

  const handleRetry = () => {
    generateQrCode();
  };


  return (
    <Modal
      transparent
      animationType="fade"
      visible={visible}
      onRequestClose={handleClose}
      statusBarTranslucent={Platform.OS === 'android'}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <Text style={styles.title}>Scan to Pay</Text>

          {qrError ? (
            <View style={styles.qrPlaceholder}>
              <Text style={styles.errorText}>Failed to generate QR Code</Text>
              <TouchableOpacity 
                onPress={handleRetry}
                style={styles.retryButton}
              >
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : isQrReady && qrValue ? (
            <View style={styles.qrContainer}>
              <QRCode 
                value={qrValue} 
                size={200}
                onError={handleQRError}
                backgroundColor="white"
                color="black"
              />
            </View>
          ) : (
            <View style={styles.qrPlaceholder}>
              <ActivityIndicator size="large" color="#666" />
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
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    width: '80%',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  qrContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 200,
    height: 200,
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 10,
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
    marginTop: 10,
  },
  errorText: {
    fontSize: 14,
    color: '#ff0000',
    textAlign: 'center',
    marginBottom: 10,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
});
