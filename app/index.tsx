import { IconSymbol } from "@/components/ui/IconSymbol";
import UpiQRModal from "@/components/UpiQRModal";
import { getFormatCurrency } from "@/utils/formatCurrency";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system";
import * as MediaLibrary from "expo-media-library";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import moment from "moment";
import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import ViewShot from "react-native-view-shot";

// --- New WhatsAppShareCheckbox component ---

// Define the item structure
interface Item {
  id: number;
  itemName: string;
  totalMeter: string;
  pc: string;
  rate: string;
  total: number;
  itemDescription?: string;
}

const MAX_ITEMS = 7;

const initialItem = (): Item => ({
  id: Date.now() + Math.random(),
  itemName: "",
  pc: "",
  totalMeter: "",
  rate: "",
  total: 0,
  itemDescription: "",
});

const showError = (title: string, message: string) => {
  Alert.alert(title, message);
};

export default function HomeScreen() {
  const [mobile, setMobile] = useState<string>("");
  const [date, setDate] = useState<string>(moment().format("DD/MM/YYYY"));
  const [customerName, setCustomerName] = useState<string>("");
  const [bundles, setBundles] = useState<string>("");
  const [balanceOutstanding, setBalanceOutstanding] = useState<string>("");
  const [items, setItems] = useState<Item[]>([initialItem()]);
  const [refreshing, setRefreshing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const viewShotRef = useRef<ViewShot>(null);
  const currenctField = useRef<TextInput>(null);
  const [isPrint, setIsPrint] = useState<boolean>(false);
  const [openQr, setOpenQr] = useState<boolean>(false);
  const [isGPayLoading, setIsGpayLoading] = useState<boolean>(false);

  // WhatsApp share state
  const [shareToWhatsApp, setShareToWhatsApp] = useState(false);

  // Memoized calculations for performance
  const totalPcs = useMemo(
    () => items.reduce((acc, curr) => acc + Number(curr.pc), 0),
    [items]
  );

  const getTotalAmount = useCallback(() => {
    return items.reduce((acc, item) => acc + item.total, 0);
  }, [items]);

  const evaluateExpression = useCallback((expression: string): number => {
    try {
      // Replace symbols × and ÷ with * and /
      const sanitizedExpression = expression
        .replace(/×/g, "*")
        .replace(/÷/g, "/");

      // Only allow numbers, +, -, *, /, (, ), and decimal points
      if (!/^[0-9+\-*/.() ]+$/.test(sanitizedExpression)) {
        return 0;
      }

      const result = Function(
        `"use strict"; return (${sanitizedExpression})`
      )();

      return isNaN(result) ? 0 : parseFloat(result.toFixed(2));
    } catch {
      return 0;
    }
  }, []);

  const getTotalAmountBalanceOutstading = useCallback(() => {
    const tot = `${getTotalAmount()}${
      balanceOutstanding
        ? /^[+-]/.test(balanceOutstanding)
          ? balanceOutstanding
          : `+${balanceOutstanding}`
        : ""
    }`;
    const result = evaluateExpression(tot);
    return isNaN(result)
      ? "₹0.00"
      : new Intl.NumberFormat("en-IN", {
          style: "currency",
          currency: "INR",
          minimumFractionDigits: 2,
        }).format(result);
  }, [getTotalAmount, balanceOutstanding, evaluateExpression]);

  const getNextSlipId = async () => {
    try {
      const currentCount = await AsyncStorage.getItem("slipCount");
      const nextCount = currentCount ? parseInt(currentCount) + 1 : 1;
      await AsyncStorage.setItem("slipCount", nextCount.toString());
      return nextCount;
    } catch (error) {
      showError("Error", "Failed to get slip ID.");
      return 1;
    }
  };

  const validateForm = useCallback(() => {
    const errors: string[] = [];
    if (!customerName.trim()) errors.push("Customer name is required.");
    if (!totalPcs) errors.push("Pieces are required.");
    if (!bundles.toString().trim()) errors.push("Bundle is required.");
    if (!items.some((item) => item.itemName.trim()))
      errors.push("Please add at least one item.");
    if (!items.some((item) => item.rate.trim()))
      errors.push("Rate is required.");
    if (errors.length) {
      showError("Form Error", errors.join("\n"));
      return false;
    }
    return true;
  }, [customerName, totalPcs, bundles, items]);

  // Optimized item change handler
  const handleItemChange = useCallback(
    (field: keyof Item, value: string, id: number) => {
      setItems((prevItems) =>
        prevItems.map((item) => {
          if (item.id !== id) return item;
          const updatedItem = { ...item, [field]: value };
          if (field === "itemDescription") {
            const calculatedMeter = evaluateExpression(value);
            updatedItem.totalMeter =
              calculatedMeter > 0 ? calculatedMeter.toString() : "";
          }
          const meter = parseFloat(updatedItem.totalMeter) || 0;
          const rate = parseFloat(updatedItem.rate) || 0;
          updatedItem.total = meter * rate;
          return updatedItem;
        })
      );
    },
    [evaluateExpression]
  );

  const addItem = useCallback((): void => {
    if (items.length < MAX_ITEMS) {
      setItems((prevItems) => [...prevItems, initialItem()]);
    }
  }, [items.length]);

  const removeItem = useCallback((id: number): void => {
    setItems((prevItems) => prevItems.filter((item) => item.id !== id));
  }, []);

  // Error-handling for image generation
  const imageGenerationURI = async (): Promise<string | undefined> => {
    try {
      const permission = await MediaLibrary.requestPermissionsAsync();
      if (!permission.granted) {
        showError(
          "Permission Required",
          "Permission to access media library is required!"
        );
        return;
      }
      if (!viewShotRef.current) {
        showError("Error", "Unable to capture image. Please try again.");
        return;
      }
      const uri = await viewShotRef.current.capture?.();
      if (!uri) {
        showError("Error", "Failed to capture image.");
        return;
      }
      return uri;
    } catch (error) {
      showError("Error", "Failed to generate image. Please try again.");
      return;
    }
  };

  const printLocalImage = async () => {
    if (!validateForm()) return;
    try {
      setIsPrint(true);
      const uri = await imageGenerationURI();
      if (!uri) throw new Error("Image URI not generated");
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const htmlContent = `
        <html>
          <body style="text-align: center;">
            <img src="data:image/png;base64,${base64}" style="width:100%;max-width:600px;" />
          </body>
        </html>
      `;
      await Print.printAsync({ html: htmlContent });
    } catch (error) {
      showError("Error", "Failed to Print Image. Please try again.");
    } finally {
      setIsPrint(false);
    }
  };

  // --- Modified: handleGenerateAndShareImage now only shares to gallery/share sheet ---
  const handleGenerateAndShareImage = async () => {
    if (!validateForm()) return;

    setIsGenerating(true);
    try {
      const uri = await imageGenerationURI();

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri as string, {
          mimeType: "image/png",
        });
      } else {
        Alert.alert("Error", "Sharing not available on this device");
      }
    } catch (error) {
      Alert.alert("Error", "Sharing not available on this device");
    } finally {
      setIsGenerating(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setMobile("");
    setDate(moment().format("DD/MM/YYYY"));
    setCustomerName("");
    setBundles("");
    setBalanceOutstanding("");
    setIsPrint(false);
    setItems([initialItem()]);
    setTimeout(() => {
      setRefreshing(false);
      currenctField.current?.focus?.();
    }, 300);
  }, []);

  const upiId = "akshayfabricsmj@icici";
  const payeeName = "Akshay Fabrics";
  const amount = getTotalAmountBalanceOutstading();

  const handleGPay = () => {
    if (!validateForm()) return;
    setIsGpayLoading(true);
    setOpenQr(true);
  };

  const handleCloseGPay = () => {
    setOpenQr(false);
    setIsGpayLoading(false);
  };

  // --- WhatsApp share handler ---
  const handleShareToWhatsApp = async (whatsappNumber: string) => {
    if (!validateForm()) return;
    setIsGenerating(true);
    try {
      const uri = await imageGenerationURI();
      if (!uri) throw new Error("Image URI not generated");

      // Read file as base64
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Save to cache as a file
      const fileUri = FileSystem.cacheDirectory + "packing_slip.png";
      await FileSystem.writeAsStringAsync(fileUri, base64, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // WhatsApp expects a file:// URI
      const url = `whatsapp://send?phone=${whatsappNumber}&text=Packing Slip Attached`;
      // Use Linking to open WhatsApp with the image
      // But WhatsApp does not support direct image sharing via URL, so use Sharing API with WhatsApp as the target
      await Sharing.shareAsync(fileUri, {
        mimeType: "image/png",
        dialogTitle: "Share Packing Slip",
        UTI: "public.png",
      });
    } catch (error) {
      Alert.alert("Error", "Failed to share to WhatsApp.");
    } finally {
      setIsGenerating(false);
    }
  };

  // Redesigned, optimized render
  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      >
        <ScrollView
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 24 }}
        >
          <View style={styles.headerSection}>
            <Text style={styles.title}>Packing Slip</Text>
          </View>

          <View style={styles.content}>
            {/* Customer Info */}
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>Customer Information</Text>
                <TouchableOpacity
                  onPress={onRefresh}
                  style={styles.clearButton}
                >
                  <Text style={styles.clearButtonText}>Clear All</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Mobile Number</Text>
                <TextInput
                  style={styles.textInput}
                  value={mobile}
                  onChangeText={setMobile}
                  placeholder="Enter mobile number"
                  keyboardType="phone-pad"
                  placeholderTextColor="#999"
                  ref={currenctField}
                  returnKeyType="next"
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Date</Text>
                <TextInput
                  style={styles.textInput}
                  value={date}
                  onChangeText={setDate}
                  placeholder="DD/MM/YYYY"
                  placeholderTextColor="#999"
                  returnKeyType="next"
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Customer Name</Text>
                <TextInput
                  style={styles.textInput}
                  value={customerName}
                  onChangeText={setCustomerName}
                  placeholder="Enter customer name"
                  placeholderTextColor="#999"
                  returnKeyType="next"
                />
              </View>
            </View>

            {/* Item Details */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Item Details</Text>
              <FlatList
                data={items}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item, index }) => (
                  <View style={styles.itemCard}>
                    <View style={styles.itemHeader}>
                      <Text style={styles.itemTitle}>Item {index + 1}</Text>
                      {items.length > 1 && (
                        <TouchableOpacity onPress={() => removeItem(item.id)}>
                          <Text style={styles.removeButton}>Remove</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                    <View style={styles.gap}>
                      <Text style={styles.itemLabel}>Item Name</Text>
                      <TextInput
                        style={styles.textInput}
                        placeholder="Item Name"
                        value={item.itemName}
                        onChangeText={(text) =>
                          handleItemChange("itemName", text, item.id)
                        }
                        placeholderTextColor="#999"
                        returnKeyType="next"
                      />
                    </View>
                    <View style={styles.gap}>
                      <Text style={styles.itemLabel}>Description</Text>
                      <TextInput
                        style={styles.textInput}
                        placeholder="Description"
                        value={item.itemDescription}
                        onChangeText={(text) =>
                          handleItemChange("itemDescription", text, item.id)
                        }
                        placeholderTextColor="#999"
                        returnKeyType="next"
                      />
                    </View>
                    <View style={styles.row}>
                      <View style={[styles.gap, styles.halfWidth]}>
                        <Text style={styles.itemLabel}>Pieces</Text>
                        <TextInput
                          style={styles.textInput}
                          placeholder="Pieces"
                          value={item.pc}
                          keyboardType="numeric"
                          onChangeText={(text) =>
                            handleItemChange("pc", text, item.id)
                          }
                          placeholderTextColor="#999"
                          returnKeyType="next"
                        />
                      </View>
                      <View style={[styles.gap, styles.halfWidth]}>
                        <Text style={styles.itemLabel}>Total Meter</Text>
                        <TextInput
                          style={styles.textInput}
                          placeholder="Total Meter"
                          value={item.totalMeter}
                          keyboardType="numeric"
                          onChangeText={(text) =>
                            handleItemChange("totalMeter", text, item.id)
                          }
                          placeholderTextColor="#999"
                          returnKeyType="next"
                        />
                      </View>
                    </View>
                    <View style={styles.row}>
                      <View style={[styles.gap, styles.halfWidth]}>
                        <Text style={styles.itemLabel}>Rates</Text>
                        <TextInput
                          style={styles.textInput}
                          placeholder="Rate (₹)"
                          value={item.rate}
                          keyboardType="numeric"
                          onChangeText={(text) =>
                            handleItemChange("rate", text, item.id)
                          }
                          placeholderTextColor="#999"
                          returnKeyType="done"
                        />
                      </View>
                      <View style={[styles.gap, styles.halfWidth]}>
                        <Text style={styles.itemLabel}>Total:</Text>
                        <View style={styles.totalContainer}>
                          <Text style={styles.totalValue}>
                            {getFormatCurrency(item.total)}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>
                )}
                ListFooterComponent={
                  <TouchableOpacity
                    onPress={addItem}
                    style={[
                      styles.addButton,
                      {
                        opacity: items.length < MAX_ITEMS ? 1 : 0.7,
                        backgroundColor:
                          items.length < MAX_ITEMS ? "#4CAF50" : "#88898a",
                      },
                    ]}
                    disabled={items.length >= MAX_ITEMS}
                  >
                    <Text style={styles.addButtonText}>
                      + Add Item{" "}
                      {items.length < MAX_ITEMS ? "" : "(Max 7 items)"}
                    </Text>
                  </TouchableOpacity>
                }
                scrollEnabled={false}
              />
              <View style={styles.grandTotalContainer}>
                <Text style={styles.grandTotalLabel}>Total Pieces:</Text>
                <Text style={styles.grandTotalValue}>
                  {totalPcs ? `${totalPcs}` : "0"}
                </Text>
              </View>
              <View style={styles.grandTotalContainer}>
                <Text style={styles.grandTotalLabel}>Gross Amount:</Text>
                <Text style={styles.grandTotalValue}>
                  {getFormatCurrency(getTotalAmount())}
                </Text>
              </View>
            </View>

            {/* Bundles */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Bundles</Text>
              <View style={styles.inputGroup}>
                <TextInput
                  style={styles.textInput}
                  value={bundles}
                  onChangeText={setBundles}
                  placeholder="Enter bundle information"
                  placeholderTextColor="#999"
                  returnKeyType="done"
                />
              </View>
            </View>

            {/* Balance Outstanding */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Balance Outstanding</Text>
              <View style={styles.inputGroup}>
                <TextInput
                  style={styles.textInput}
                  value={balanceOutstanding}
                  onChangeText={setBalanceOutstanding}
                  placeholder="Enter balance outstanding"
                  placeholderTextColor="#999"
                  returnKeyType="done"
                />
              </View>
              <View style={styles.grandTotalContainer}>
                <Text style={styles.grandTotalLabel}>Net Amount:</Text>
                <Text style={styles.grandTotalValue}>
                  {getTotalAmountBalanceOutstading()}
                </Text>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.rowStart}>
              <TouchableOpacity
                onPress={printLocalImage}
                style={[
                  styles.shareButton,
                  {
                    width: "48%",
                    backgroundColor: "transparent",
                    borderColor: "#000",
                    borderWidth: 2,
                  },
                ]}
                disabled={isGenerating}
              >
                {isPrint ? (
                  <ActivityIndicator color="#000" size="small" />
                ) : (
                  <View style={styles.actionButtonRow}>
                    <IconSymbol size={18} name="printer" color={"#000"} />
                    <Text style={[styles.shareButtonText, { color: "#000" }]}>
                      Print
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleGenerateAndShareImage}
                style={[
                  styles.shareButton,
                  { width: "48%", backgroundColor: "#000" },
                ]}
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <View style={styles.actionButtonRow}>
                    <FontAwesome name="share" size={19} color="white" />
                    <Text style={styles.shareButtonText}>Share Image</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>

            {/* WhatsApp Share Checkbox and Button */}
            {/* <WhatsAppShareCheckbox
              checked={shareToWhatsApp}
              onCheckedChange={setShareToWhatsApp}
              mobile={mobile}
              isGenerating={isGenerating}
              onShare={handleShareToWhatsApp}
            /> */}

            {/* Payment Button */}
            <TouchableOpacity
              onPress={handleGPay}
              style={[
                styles.shareButton,
                {
                  backgroundColor: "#000",
                  borderRadius: 8,
                  paddingVertical: 12,
                  paddingHorizontal: 20,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: isGPayLoading ? 0.7 : 1,
                  marginTop: 16,
                },
              ]}
              disabled={isGPayLoading}
            >
              {isGPayLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Text
                    style={{
                      color: "#fff",
                      fontSize: 16,
                      fontWeight: "600",
                    }}
                  >
                    Pay with GPay
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* QR Modal */}
          <UpiQRModal
            amount={getTotalAmountBalanceOutstading()}
            onClose={handleCloseGPay}
            payeeName={payeeName}
            upiId={upiId}
            visible={openQr}
          />

          {/* Hidden ViewShot for Image Generation */}
          <View style={styles.hiddenView}>
            <ViewShot
              ref={viewShotRef}
              options={{
                fileName: "PackingSlip",
                format: "png",
                quality: 1.0,
                width: 800,
                height: 600,
              }}
            >
              <View style={styles.printableContainer}>
                <View style={styles.printHeader}>
                  <Text style={styles.printTitle}>PACKING SLIP</Text>
                </View>

                <View style={styles.printInfoSection}>
                  <View style={styles.printRow}>
                    <View style={styles.rowStart}>
                      <Text style={styles.printLabel}>Mobile No.:</Text>
                      <View style={styles.printLabelValue}>
                        <Text>{mobile}</Text>
                      </View>
                    </View>

                    <Text style={styles.printLabel}>
                      Date: <Text style={styles.printLabelValue}>{date}</Text>
                    </Text>
                  </View>

                  <View style={styles.printRow}>
                    <View style={styles.rowStart}>
                      <Text style={styles.printLabel}>Name:</Text>
                      <View style={[styles.printLabelValue, { width: "80%" }]}>
                        <Text>{customerName}</Text>
                      </View>
                    </View>

                    <Text style={styles.printLabel}>
                      Time: {moment().format("HH:mm")}
                    </Text>
                  </View>
                </View>

                <View style={styles.printTable}>
                  <View style={styles.printTableHeader}>
                    <Text
                      style={[
                        styles.printTableCell,
                        styles.printTableHeaderCell,
                        { width: "15%" },
                      ]}
                    >
                      Item Name
                    </Text>
                    <Text
                      style={[
                        styles.printTableCell,
                        styles.printTableHeaderCell,
                        { width: "30%" },
                      ]}
                    >
                      Description
                    </Text>
                    <Text
                      style={[
                        styles.printTableCell,
                        styles.printTableHeaderCell,
                        { width: "10%" },
                      ]}
                    >
                      Pcs.
                    </Text>
                    <Text
                      style={[
                        styles.printTableCell,
                        styles.printTableHeaderCell,
                        { width: "15%" },
                      ]}
                    >
                      Total Mtr.
                    </Text>
                    <Text
                      style={[
                        styles.printTableCell,
                        styles.printTableHeaderCell,
                        { width: "15%" },
                      ]}
                    >
                      Rate
                    </Text>
                    <Text
                      style={[
                        styles.printTableCell,
                        styles.printTableHeaderCell,
                        { width: "15%" },
                      ]}
                    >
                      Amount
                    </Text>
                  </View>

                  {[
                    ...items,
                    ...Array(Math.max(0, 7 - items.length)).fill({}),
                  ].map((item, index) => (
                    <View key={index} style={styles.printTableRow}>
                      <Text style={[styles.printTableCell, { width: "15%" }]}>
                        {item?.itemName || ""}
                      </Text>
                      <Text style={[styles.printTableCell, { width: "30%" }]}>
                        {item?.itemDescription || ""}
                      </Text>
                      <Text style={[styles.printTableCell, { width: "10%" }]}>
                        {item?.pc || ""}
                      </Text>
                      <Text style={[styles.printTableCell, { width: "15%" }]}>
                        {item?.totalMeter || ""}
                      </Text>
                      <Text style={[styles.printTableCell, { width: "15%" }]}>
                        {item?.rate ? `₹${item.rate}` : ""}
                      </Text>
                      <Text style={[styles.printTableCell, { width: "15%" }]}>
                        {item?.total > 0 ? getFormatCurrency(item.total) : ""}
                      </Text>
                    </View>
                  ))}

                  {/***Total ******/}
                  <View style={styles.printTableRow}>
                    <Text
                      style={[
                        styles.printTableCell,
                        { width: "45%", fontWeight: "600" },
                      ]}
                    >
                      Total
                    </Text>
                    {/* <Text style={[styles.printTableCell, { width: "30%" }]}> */}
                    {/* {item?.itemDescription || ""} */}
                    {/* </Text> */}
                    <Text
                      style={[
                        styles.printTableCell,
                        { width: "10%", fontWeight: "600" },
                      ]}
                    >
                      {/* {item?.pc || ""} */}
                      {totalPcs ? totalPcs : ""}
                    </Text>
                    <Text style={[styles.printTableCell, { width: "30%" }]}>
                      {/* {item?.totalMeter || ""} */}
                    </Text>
                    {/* <Text style={[styles.printTableCell, { width: "15%" }]}> */}
                    {/* {item?.rate ? `₹${item.rate}` : ""} */}
                    {/* </Text> */}
                    <Text
                      style={[
                        styles.printTableCell,
                        { width: "15%", fontWeight: "600" },
                      ]}
                    >
                      {getTotalAmount()
                        ? getFormatCurrency(getTotalAmount())
                        : ""}
                    </Text>
                  </View>
                </View>

                <View style={styles.printFooter}>
                  <Text
                    style={[
                      styles.printLabel,
                      {
                        marginLeft: "auto",
                        width: "auto",
                      },
                    ]}
                  >
                    Balance :{" "}
                    {balanceOutstanding ? `₹${balanceOutstanding}` : "0"}
                  </Text>
                  <Text style={styles.printTotalText}>
                    Total Amount:
                    {getTotalAmountBalanceOutstading()}
                  </Text>
                  <View style={styles.rowStart}>
                    <Text style={styles.printLabel}>Bundles:</Text>
                    <View style={[styles.printLabelValue, { width: "50%" }]}>
                      <Text>{bundles}</Text>
                    </View>
                  </View>
                </View>
              </View>
            </ViewShot>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  content: {
    flex: 1,
    padding: 10,
  },
  headerSection: {
    backgroundColor: "#FFEA00",
    paddingVertical: 18,
    paddingHorizontal: 10,
    alignItems: "center",
    borderBottomWidth: 1,
    borderColor: "#e0e0e0",
  },
  title: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#000",
    letterSpacing: 1,
  },
  section: {
    backgroundColor: "#fff",
    marginBottom: 12,
    padding: 12,
    borderRadius: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "bold",
    color: "#333",
  },
  clearButton: {
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: "#f22e2e",
    backgroundColor: "#fff2f2",
    borderRadius: 5,
  },
  clearButtonText: {
    color: "#f22e2e",
    fontWeight: "600",
    fontSize: 13,
  },
  inputGroup: {
    marginBottom: 10,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 3,
    color: "#333",
  },
  textInput: {
    backgroundColor: "#f8f8f8",
    color: "#000",
    borderWidth: 1,
    borderColor: "#ddd",
    padding: 10,
    borderRadius: 6,
    fontSize: 15,
  },
  itemCard: {
    backgroundColor: "#f9f9f9",
    padding: 12,
    marginBottom: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    gap: 4,
  },
  itemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#333",
  },
  removeButton: {
    color: "#e74c3c",
    fontSize: 13,
    fontWeight: "500",
  },
  itemLabel: {
    color: "#454545",
    fontSize: 12,
    fontWeight: "500",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  rowStart: {
    flexDirection: "row",
    gap: 8,
    paddingBottom: 7,
    alignItems: "center",
  },
  halfWidth: {
    flex: 1,
  },
  totalContainer: {
    backgroundColor: "#f0f0f0",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#ddd",
    padding: 10,
    fontSize: 15,
  },
  totalValue: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#2196F3",
  },
  addButton: {
    backgroundColor: "#4CAF50",
    padding: 10,
    borderRadius: 6,
    alignItems: "center",
    marginTop: 4,
    marginBottom: 2,
  },
  addButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 15,
  },
  grandTotalContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
    padding: 10,
    backgroundColor: "#e3f2fd",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#2196F3",
  },
  grandTotalLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: "#333",
  },
  grandTotalValue: {
    fontSize: 17,
    fontWeight: "bold",
    color: "#2196F3",
  },
  shareButton: {
    backgroundColor: "#FF9800",
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
    flex: 1,
    marginTop: 8,
  },
  shareButtonText: {
    color: "#ffffff",
    fontWeight: "bold",
    fontSize: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  actionButtonRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  hiddenView: {
    position: "absolute",
    left: -9999,
    top: -9999,
  },
  printableContainer: {
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
    fontSize: 16,
    fontWeight: "500",
  },
  printLabelValue: {
    borderBottomWidth: 1,
    borderColor: "#7a7979",
    minWidth: 200,
  },
  printTable: {
    borderWidth: 1,
    borderColor: "#7a7979",
    marginBottom: 3,
  },
  printTableHeader: {
    flexDirection: "row",
    backgroundColor: "#f0f0f0",
  },
  printTableRow: {
    flexDirection: "row",
    minHeight: 35,
  },
  printTableCell: {
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#7a7979",
    padding: 8,
    fontSize: 14,
    textAlignVertical: "top",
  },
  printTableHeaderCell: {
    fontWeight: "600",
    textAlign: "center",
  },
  printFooter: {
    marginTop: 15,
  },
  printTotalText: {
    fontSize: 20,
    fontWeight: "bold",
    textAlign: "right",
    marginBottom: 15,
    marginTop: 5,
  },
  printBundlesText: {
    fontSize: 16,
    padding: 10,
    borderWidth: 1,
    borderColor: "#000",
  },
  gap: {
    gap: 5,
  },
});
