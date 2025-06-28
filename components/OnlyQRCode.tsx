import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';


interface IUpiPros {
  visible: boolean,
  onClose: () => void,
  upiId: string,
  payeeName: string,
  amount: string
  bundles: string
}

const UpiQRModalBar = ({ visible, onClose, upiId, payeeName, amount, bundles }: IUpiPros) => {
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

  return(
    <View style={styles.modalContainer}>
      <Text style={styles.title}>Scan to Pay</Text>

      <View style={{flexDirection : 'row', gap : 40, alignItems : 'center'}}>
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
              size={80}
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

        <View>
              <Text style={{fontWeight : 500, fontSize : 18}}>Akshay Fabrics</Text>
              <Text style={{fontSize : 18}}>Mob no. 9820116595</Text>
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: 25 }}>
        <Text style={styles.upiText}>UPI ID: {upiId}</Text>
        <View style={[{ margin: "auto", flexDirection: "row", gap: 2, marginRight : -150 }]}>
          <Text style={styles.printLabel}>Bundles:</Text>
          <View style={[styles.printLabelValue, { width: "10%" }]}>
            <Text style={{ fontSize : 20, paddingLeft : 10}}>{bundles}</Text>
          </View>
        </View>
      </View>
    </View>
  )
};

export default UpiQRModalBar;

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
    // alignItems: 'center',
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
    fontSize: 14,
    fontWeight: '600',
  },
  qrContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 80,
    height: 100,
    backgroundColor: 'white',
    borderRadius: 8,
    paddingVertical: 10,
  },
  amountText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '500',
  },
  upiText: {
    fontSize: 16,
    color: '#000',
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
    width: 80,
    height: 80,
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
  rintableContainer: {
    backgroundColor: "#fff",
    padding: 20,
    width: 800,
    minHeight: 600,
  },
  printHeader: {
    alignItems: "center",
    marginBottom: 20,
  },
  printTitle: {
    fontSize: 28,
    fontWeight: "bold",
    letterSpacing: 2,
  },
  printInfoSection: {
    marginBottom: 4,
    padding: 4,
  },
  printRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 5,
    flex: 1,
  },
  printLabel: {
    fontSize: 20,
    fontWeight: "500",
  },
  printLabelValue: {
    borderBottomWidth: 1,
    borderColor: "#7a7979",
    minWidth: 200,
    fontSize : 20
  },
});
