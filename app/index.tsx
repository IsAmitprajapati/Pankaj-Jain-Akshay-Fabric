import React, { useRef, useState, useCallback } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Sharing from "expo-sharing";
import AsyncStorage from "@react-native-async-storage/async-storage";
import moment from "moment";
import ViewShot from "react-native-view-shot";
import * as MediaLibrary from "expo-media-library";
import { getFormatCurrency } from "@/utils/formatCurrency";


// Define the item structure
interface Item {
  id: number;
  itemName: string;
  pc: string;
  totalMeter: string;
  rate: string;
  total: number;
  itemDescription?: string;
}

export default function HomeScreen() {
  const [mobile, setMobile] = useState<string>("");
  const [date, setDate] = useState<string>(moment().format("DD/MM/YYYY"));
  const [customerName, setCustomerName] = useState<string>("");
  const [bundles, setBundles] = useState<string>("");
  const [balanceOutstanding, setBalanceOutstanding] = useState<string>("");
  const [items, setItems] = useState<Item[]>([
    {
      id: Date.now(),
      itemName: "",
      pc: "",
      totalMeter: "",
      rate: "",
      total: 0,
      itemDescription: "",
    },
  ]);
  const [refreshing, setRefreshing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const viewShotRef = useRef<ViewShot>(null);
  const currenctField = useRef(null);

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
    if (items.length < 7) {
      setItems((prevItems) => [
        ...prevItems,
        {
          id: Date.now() + Math.random(),
          itemName: "",
          pc: "",
          totalMeter: "",
          rate: "",
          total: 0,
          itemDescription: "",
        },
      ]);
    }
  }, [items]);

  const removeItem = useCallback((id: number): void => {
    setItems((prevItems) => prevItems.filter((item) => item.id !== id));
  }, []);

  const getTotalAmount = useCallback(() => {
    return items.reduce((acc, item) => acc + item.total, 0);
  }, [items]);

  const getTotalAmountBalanceOutstading = useCallback(() => {
    const tot = `${getTotalAmount()}${
      balanceOutstanding
        ? /^[+-]/.test(balanceOutstanding)
          ? balanceOutstanding
          : `+${balanceOutstanding}`
        : ""
    }`;

    const result = evaluateExpression(tot);
    // If result is valid, format as currency; else return "₹0.00"
    const formattedResult = isNaN(result)
      ? "₹0.00"
      : new Intl.NumberFormat("en-IN", {
          style: "currency",
          currency: "INR",
          minimumFractionDigits: 2,
        }).format(result);

    return formattedResult.toString();
  }, [items, balanceOutstanding]);

  const getNextSlipId = async () => {
    try {
      const currentCount = await AsyncStorage.getItem("slipCount");
      const nextCount = currentCount ? parseInt(currentCount) + 1 : 1;
      await AsyncStorage.setItem("slipCount", nextCount.toString());
      return nextCount;
    } catch (error) {
      console.error("Error getting slip ID:", error);
      return 1;
    }
  };

  const validateForm = () => {
    // if (!customerName.trim()) {
    //   Alert.alert("Validation Error", "Please enter customer name");
    //   return false;
    // }
    // if (items.every(item => !item.itemName.trim())) {
    //   Alert.alert("Validation Error", "Please add at least one item");
    //   return false;
    // }
    return true;
  };

  const handleGenerateAndShareImage = async () => {
    if (!validateForm()) return;

    setIsGenerating(true);
    try {
      const permission = await MediaLibrary.requestPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          "Permission Required",
          "Permission to access media library is required!"
        );
        return;
      }

      if (!viewShotRef.current) {
        Alert.alert("Error", "Unable to capture image. Please try again.");
        return;
      }

      const uri = await viewShotRef.current.capture();

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: "image/png",
        });
      } else {
        Alert.alert("Error", "Sharing not available on this device");
      }
    } catch (error) {
      console.error("Failed to generate image:", error);
      Alert.alert("Error", "Failed to generate image. Please try again.");
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
    setItems([
      {
        id: Date.now(),
        itemName: "",
        pc: "",
        totalMeter: "",
        rate: "",
        total: 0,
        itemDescription: "",
      },
    ]);
    setTimeout(() => {
      setRefreshing(false);
      if (currenctField && currenctField?.current) {
        if (currenctField?.current?.focus) {
          currenctField?.current?.focus();
        }
      }
    }, 500);
  }, []);

  const totalPcs = items.reduce((acc, curr) => acc + Number(curr.pc), 0);
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
          // keyboardShouldPersistTaps="handled"
          // contentContainerStyle={{ flexGrow: 1 }}
        >
          <View style={styles.headerSection}>
            <Text style={styles.title}>Packing Slip</Text>
          </View>

          <View style={styles.content}>
            {/* Basic Info */}
            <View style={styles.section}>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Text style={styles.sectionTitle}>Customer Information</Text>
                <TouchableOpacity
                  onPress={onRefresh}
                  style={{
                    paddingVertical: 4,
                    paddingHorizontal: 8,
                    borderWidth: 1,
                    borderColor: "#f22e2e",
                    backgroundColor: "#fff2f2",
                    borderRadius: 5,
                  }}
                >
                  <Text>Clear All</Text>
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
                />
              </View>

              {/* <View style={styles.inputGroup}>
                <Text style={styles.label}>Bundles</Text>
                <TextInput
                  style={styles.textInput}
                  value={bundles}
                  onChangeText={setBundles}
                  placeholder="Enter bundle information"
                  placeholderTextColor="#999"
                />
              </View> */}
            </View>

            {/* Item Details */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Item Details</Text>

              {items.map((item, index) => (
                <View key={item.id} style={styles.itemCard}>
                  <View style={styles.itemHeader}>
                    <Text style={styles.itemTitle}>Item {index + 1}</Text>
                    {items.length > 1 && (
                      <TouchableOpacity onPress={() => removeItem(item.id)}>
                        <Text style={styles.removeButton}>Remove</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  <View style={[styles.gap]}>
                    <Text style={styles.itemLabel}>Item Name</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="Item Name"
                      value={item.itemName}
                      onChangeText={(text) =>
                        handleItemChange("itemName", text, item.id)
                      }
                      placeholderTextColor="#999"
                    />
                  </View>

                  <View style={[styles.gap]}>
                    <Text style={styles.itemLabel}>Description</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="Description"
                      value={item.itemDescription}
                      onChangeText={(text) =>
                        handleItemChange("itemDescription", text, item.id)
                      }
                      placeholderTextColor="#999"
                    />
                  </View>

                  <View style={styles.row}>
                    <View style={[styles.gap, styles.halfWidth]}>
                      <Text style={styles.itemLabel}>Pieces</Text>
                      <TextInput
                        style={[styles.textInput]}
                        placeholder="Pieces"
                        value={item.pc}
                        keyboardType="numeric"
                        onChangeText={(text) =>
                          handleItemChange("pc", text, item.id)
                        }
                        placeholderTextColor="#999"
                      />
                    </View>

                    <View style={[styles.gap, styles.halfWidth]}>
                      <Text style={styles.itemLabel}>Total Meter</Text>
                      <TextInput
                        style={[styles.textInput]}
                        placeholder="Total Meter"
                        value={item.totalMeter}
                        keyboardType="numeric"
                        onChangeText={(text) =>
                          handleItemChange("totalMeter", text, item.id)
                        }
                        placeholderTextColor="#999"
                      />
                    </View>
                  </View>

                  <View style={styles.row}>
                    <View style={[styles.gap, styles.halfWidth]}>
                      <Text style={styles.itemLabel}>Rates</Text>
                      <TextInput
                        style={[styles.textInput]}
                        placeholder="Rate (₹)"
                        value={item.rate}
                        keyboardType="numeric"
                        onChangeText={(text) =>
                          handleItemChange("rate", text, item.id)
                        }
                        placeholderTextColor="#999"
                      />
                    </View>

                    <View style={[styles.gap, styles.halfWidth]}>
                      <Text style={styles.itemLabel}>Total:</Text>
                      <View style={[styles.totalContainer]}>
                        <Text style={styles.totalValue}>
                          {getFormatCurrency(item.total)}
                          {/* ₹{item.total.toFixed(2)} */}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              ))}

              <TouchableOpacity
                onPress={addItem}
                style={[
                  styles.addButton,
                  { opacity: items.length < 7 ? 1 : 0.8 , backgroundColor : items.length < 7 ? "#4CAF50" : "#88898a"   },
                ]}
              >
                <Text style={styles.addButtonText}>+ Add Item {  items.length < 7  ? "" : "(Max 7 item )"}</Text>
              </TouchableOpacity>

              <View style={[styles.grandTotalContainer]}>
                <Text style={[styles.grandTotalLabel]}>Total Pieces:</Text>
                <Text style={styles.grandTotalValue}>
                  {totalPcs ? `${totalPcs}` : "0"}
                  {/* ₹{getTotalAmount().toFixed(2)} */}
                </Text>
              </View>
              <View style={styles.grandTotalContainer}>
                <Text style={styles.grandTotalLabel}>Gross Amount:</Text>
                <Text style={styles.grandTotalValue}>
                  {getFormatCurrency(getTotalAmount())}
                  {/* ₹{getTotalAmount().toFixed(2)} */}
                </Text>
              </View>

            </View>

            {/**Bundles */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Bundles</Text>
              <View style={styles.inputGroup}>
                {/* <Text style={styles.label}>Bundles</Text> */}
                 <TextInput
                  style={styles.textInput}
                  value={bundles}
                  onChangeText={setBundles}
                  placeholder="Enter bundle information"
                  placeholderTextColor="#999"
                />
              </View>
         
            </View>

            {/***Additional details */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Balance outstanding</Text>
              <View style={styles.inputGroup}>
                {/* <Text style={styles.label}>Bundles</Text> */}
                <TextInput
                  style={styles.textInput}
                  value={balanceOutstanding}
                  onChangeText={setBalanceOutstanding}
                  placeholder="Enter balance outstanding"
                  placeholderTextColor="#999"
                />
              </View>
              <View style={styles.grandTotalContainer}>
                <Text style={styles.grandTotalLabel}>Net Amount:</Text>
                <Text style={styles.grandTotalValue}>
                  {getTotalAmountBalanceOutstading()}
                  {/* ₹{getTotalAmount().toFixed(2)} */}
                </Text>
              </View>
            </View>

            {/* Action Button */}
            <TouchableOpacity
              onPress={handleGenerateAndShareImage}
              style={styles.shareButton}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.shareButtonText}>
                  📱 Generate & Share Image
                </Text>
              )}
            </TouchableOpacity>
          </View>

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
                        { width: "45%", fontWeight: "semibold" },
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
                        { width: "10%", fontWeight: "semibold" },
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
    flexGrow: 1,
    backgroundColor: "#f5f5f5",
  },
  content: {
    flex: 1,
    padding: 16,
  },
  headerSection: {
    backgroundColor: "#FFEA00",
    paddingVertical: 20,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#000000",
  },
  section: {
    backgroundColor: "#fff",
    marginBottom: 10,
    padding: 16,
    borderRadius: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 16,
    color: "#333",
  },
  inputGroup: {
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 4,
    color: "#333",
  },
  textInput: {
    backgroundColor: "#fff",
    color: "#000",
    borderWidth: 1,
    borderColor: "#ddd",
    padding: 12,
    borderRadius: 6,
    fontSize: 16,
  },
  itemCard: {
    backgroundColor: "#f9f9f9",
    padding: 16,
    marginBottom: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    gap: 4,
  },
  itemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  removeButton: {
    color: "#e74c3c",
    fontSize: 14,
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
  },
  halfWidth: {
    flex: 1,
  },
  totalContainer: {
    // flexDirection: "row",
    // alignItems: "center",
    // justifyContent: "space-between",
    // paddingHorizontal: 12,
    // paddingVertical: 12,
    backgroundColor: "#f0f0f0",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#ddd",

    // color: "#000",
    // borderWidth: 1,
    // borderColor: "#ddd",
    padding: 12,
    // borderRadius: 6,
    fontSize: 16,
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  totalValue: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#2196F3",
  },
  addButton: {
    backgroundColor: "#4CAF50",
    padding: 12,
    borderRadius: 6,
    alignItems: "center",
    marginTop: 8,
  },
  addButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  grandTotalContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 16,
    padding: 14,
    paddingVertical: 14,
    backgroundColor: "#e3f2fd",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#2196F3",
  },
  grandTotalLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  grandTotalValue: {
    fontSize: 19,
    fontWeight: "bold",
    color: "#2196F3",
  },
  buttonContainer: {
    marginTop: 16,
  },
  shareButton: {
    backgroundColor: "#FF9800",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 50,
  },
  shareButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
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
    fontWeight: "semibold",
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
