
import numpy as np

def calculate_bmi(weight_kg, height_cm):
    height_m = height_cm / 100
    bmi = weight_kg / (height_m ** 2)
    return round(bmi, 2)

# These groupings must exactly match the string labels produced by
# encoders['nutritional_status'].classes_ in models/encoders.pkl
# (currently: Normal, Obesity, Overweight, Severe Thinness, Thinness).
# If the classifier is ever retrained with different label spelling,
# update these lists to match or get_meal_goal() will silently fall
# through to 'Maintain Weight' for the renamed classes.
UNDERWEIGHT_STATUSES = ['Severe Thinness', 'Thinness']
OVERWEIGHT_STATUSES = ['Overweight', 'Obesity']

def get_meal_goal(nutritional_status):
    if nutritional_status in UNDERWEIGHT_STATUSES:
        return 'Weight Gain'
    elif nutritional_status in OVERWEIGHT_STATUSES:
        return 'Weight Loss'
    else:
        return 'Maintain Weight'


if __name__ == '__main__':
    expected = {
        'Normal': 'Maintain Weight',
        'Overweight': 'Weight Loss',
        'Obesity': 'Weight Loss',
        'Thinness': 'Weight Gain',
        'Severe Thinness': 'Weight Gain',
    }
    for status, expected_goal in expected.items():
        actual_goal = get_meal_goal(status)
        assert actual_goal == expected_goal, (
            f"get_meal_goal({status!r}) returned {actual_goal!r}, expected {expected_goal!r}"
        )
    print('get_meal_goal smoke test passed for all known nutritional_status classes.')
