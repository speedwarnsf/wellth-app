import React, { useState } from 'react';
import { View, Text, StyleSheet, Button, Modal, TouchableOpacity } from 'react-native';
import * as Notifications from 'expo-notifications';
import { db } from '../api/firebaseConfig';
import { collection, getDocs } from 'firebase/firestore';
import { Tip } from '../data/tipData';

interface SettingsModalProps {
  visible: boolean;
  onClose: () => void;
}

const SettingsModal = ({ visible, onClose }: SettingsModalProps) => {
  const [selectedHour, setSelectedHour] = useState<number>(9);

  const scheduleNotification = async (hour: number) => {
    await Notifications.cancelAllScheduledNotificationsAsync();

    const tipsCollection = collection(db, 'tips');
    const tipSnapshot = await getDocs(tipsCollection);
    const tipsList = tipSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Tip[];
    let tipText = "Open the app to see your new tip.";
    if (tipsList.length > 0) {
      const randomIndex = Math.floor(Math.random() * tipsList.length);
      tipText = tipsList[randomIndex].text;
    }

    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Your Wellth Tip of the Day!",
        body: tipText,
      },
      trigger: {
        hour: hour,
        minute: 0,
        repeats: true,
      },
    });

    setSelectedHour(hour);
    alert(`Notifications will be sent daily at ${hour}:00`);
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.centeredView}>
        <View style={styles.modalView}>
          <Text style={styles.modalText}>Select Notification Time</Text>
          <View style={styles.timeOptions}>
            {[8, 9, 10, 11, 12, 17, 18, 19, 20].map(hour => (
              <TouchableOpacity
                key={hour}
                style={[
                  styles.timeButton,
                  selectedHour === hour && styles.selectedButton,
                ]}
                onPress={() => scheduleNotification(hour)}
              >
                <Text
                  style={[
                    styles.timeButtonText,
                    selectedHour === hour && styles.selectedButtonText,
                  ]}
                >
                  {hour}:00
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Button title="Close" onPress={onClose} />
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalView: {
    margin: 20,
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 35,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalText: {
    marginBottom: 15,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: 'bold',
  },
  timeOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginBottom: 20,
  },
  timeButton: {
    padding: 10,
    margin: 5,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  selectedButton: {
    backgroundColor: 'blue',
  },
  timeButtonText: {
    color: 'black',
  },
  selectedButtonText: {
    color: 'white',
  },
});

export default SettingsModal;
