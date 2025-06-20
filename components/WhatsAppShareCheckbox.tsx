
import FontAwesome from "@expo/vector-icons/FontAwesome";
import React from "react";
import {
    ActivityIndicator,
    Alert,
    Linking,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

interface WhatsAppShareCheckboxProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  mobile: string;
  isGenerating: boolean;
  onShare: (whatsappNumber: string) => Promise<string | undefined>; // Now expects a Promise that resolves to image URI
}

const WhatsAppShareCheckbox: React.FC<WhatsAppShareCheckboxProps> = ({
  checked,
  onCheckedChange,
  mobile,
  isGenerating,
  onShare,
}) => {
  const [whatsappNumber, setWhatsappNumber] = React.useState(mobile);

  React.useEffect(() => {
    setWhatsappNumber(mobile);
  }, [mobile]);

  // Helper to open WhatsApp with image and message
  const handleWhatsAppShare = async () => {
    if (!whatsappNumber) return;
    try {
      // Call parent to generate image and get URI
      const imageUri = await onShare(whatsappNumber);

      if (!imageUri) {
        Alert.alert("Error", "Failed to generate image for WhatsApp.");
        return;
      }

      // WhatsApp expects phone in international format without '+'
      let phone = whatsappNumber.replace(/[^0-9]/g, "");
      if (phone.startsWith("0")) phone = phone.substring(1);
      if (phone.length === 10) phone = "91" + phone;

      // Compose WhatsApp URL
      // Note: WhatsApp does not support sending images via URL scheme directly.
      // But we can open a chat with a prefilled message and instruct user to attach the image.
      // On Android, we can try to use the intent to send the image directly.
      const message = "Please find your slip attached.";

      if (Platform.OS === "android") {
        // Try to use the intent to send the image directly
        const shareOptions = {
          url: imageUri,
          type: "image/png",
        };
        // Try to use Linking with intent
        const intentUrl = `whatsapp://send?phone=${phone}&text=${encodeURIComponent(
          message
        )}`;
        // Try to open WhatsApp chat first
        const canOpen = await Linking.canOpenURL(intentUrl);
        if (canOpen) {
          Linking.openURL(intentUrl);
          // Optionally, you can show a message to user to attach the image manually
          Alert.alert(
            "Attach Image",
            "WhatsApp does not allow direct image sharing via link. Please attach the slip image from your gallery."
          );
        } else {
          Alert.alert(
            "WhatsApp Not Installed",
            "WhatsApp is not installed on your device."
          );
        }
      } else {
        // iOS: open chat with message, user must attach image manually
        const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
        const canOpen = await Linking.canOpenURL(url);
        if (canOpen) {
          Linking.openURL(url);
          Alert.alert(
            "Attach Image",
            "WhatsApp does not allow direct image sharing via link. Please attach the slip image from your gallery."
          );
        } else {
          Alert.alert(
            "WhatsApp Not Installed",
            "WhatsApp is not installed on your device."
          );
        }
      }
    } catch (err) {
      Alert.alert("Error", "Failed to open WhatsApp.");
    }
  };

  return (
    <View style={styles.waContainer}>
      <TouchableOpacity
        style={styles.checkboxRow}
        onPress={() => onCheckedChange(!checked)}
        activeOpacity={0.7}
      >
        <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
          {checked && <FontAwesome name="check" size={16} color="#fff" />}
        </View>
        <Text style={styles.waLabel}>Share to WhatsApp</Text>
      </TouchableOpacity>
      {checked && (
        <View style={styles.waInputRow}>
          <TextInput
            style={styles.waInput}
            placeholder="WhatsApp Number"
            value={whatsappNumber}
            onChangeText={setWhatsappNumber}
            keyboardType="phone-pad"
            placeholderTextColor="#999"
            editable={!isGenerating}
          />
          <TouchableOpacity
            style={[
              styles.waShareButton,
              { opacity: isGenerating ? 0.7 : 1 },
            ]}
            onPress={handleWhatsAppShare}
            disabled={isGenerating || !whatsappNumber}
          >
            {isGenerating ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <FontAwesome name="whatsapp" size={18} color="#fff" />
                <Text style={styles.waShareButtonText}>Share</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  waContainer: {
    marginTop: 18,
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: "#25D366",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
    backgroundColor: "#fff",
  },
  checkboxChecked: {
    backgroundColor: "#25D366",
    borderColor: "#25D366",
  },
  waLabel: {
    fontSize: 16,
    color: "#222",
    fontWeight: "500",
  },
  waInputRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  waInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#25D366",
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    fontSize: 15,
    marginRight: 8,
    backgroundColor: "#fff",
    color: "#222",
  },
  waShareButton: {
    backgroundColor: "#25D366",
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
  },
  waShareButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 15,
    marginLeft: 6,
  },
});

export default WhatsAppShareCheckbox;