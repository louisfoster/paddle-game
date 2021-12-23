from machine import Pin, ADC, UART
from time import sleep_ms, sleep_us
import sys
import gc

BUTTON_DOWN_MIN = 192
BUTTON_DOWN_MAX = 20550
BUTTON_UP_MIN = 26650
BUTTON_UP_MAX = 38450

TAUSEND = 6283

THRESHOLD = 25000

SAMPLES = 10


# Set to false when not in development mode
DEBUG = True


class ADCReader():

    def __init__(self, pin):

        self.samples = [0] * SAMPLES

        self.adc = ADC(Pin(pin))

        self.pin = pin

        self.btn = 0

        self.pot = 0

        self.bb = ''


    def sample(self, index):

        sleep_us(100)

        self.adc.read_u16()

        sleep_us(100)

        self.samples[index] = self.adc.read_u16()


    def calc(self):

        self.up_list = [i for i in self.samples if i >= THRESHOLD]
        self.down_list = [i for i in self.samples if i < THRESHOLD]

        # are the majority higher or lower than 25000
        if len(self.up_list) >= len(self.down_list):

            self.btn = 0 # button is up
            self.avg = sum(self.up_list) / len(self.up_list)
            self.unit = min(1, max(0, self.avg - BUTTON_UP_MIN) / (BUTTON_UP_MAX - BUTTON_UP_MIN))
            self.pot = int(self.unit * TAUSEND)

        else:

            self.btn = 1 # button down
            self.avg = sum(self.down_list) / len(self.down_list)
            self.unit = min(1, max(0, self.avg - BUTTON_DOWN_MIN) / (BUTTON_DOWN_MAX - BUTTON_DOWN_MIN))
            self.pot = int(self.unit * TAUSEND)

        if DEBUG:
            print("Pin", self.pin, "button:", self.btn, "pot:", self.pot)

        self.bb = self.btn.to_bytes(1, 'big')
        self.bb += self.pot.to_bytes(2, 'big')
        
        return self.bb


# listen on all ADCs
adcs = [ADCReader(26), ADCReader(27), ADCReader(28)]

buf = None

start = 192

count = 0

while True:

    gc.collect()

    if (count == SAMPLES):

        buf = start.to_bytes(1, 'big')
        for adc in adcs:
            buf += adc.calc()
        
        if DEBUG:
            print(buf)
        else:
            sys.stdout.buffer.write(buf)
        
        count = 0
        
    else:
        
        for adc in adcs:
            adc.sample(count)
        
        count += 1

    sleep_ms(2)
