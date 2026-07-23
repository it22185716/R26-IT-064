
import numpy as np

def calculate_bmi(weight_kg, height_cm):
    height_m = height_cm / 100
    bmi = weight_kg / (height_m ** 2)
    return round(bmi, 2)

def get_meal_goal(nutritional_status):
    if nutritional_status in ['Severely Underweight', 'Underweight']:
        return 'Weight Gain'
    elif nutritional_status in ['Overweight', 'Obese']:
        return 'Weight Loss'
    else:
        return 'Maintain Weight'
