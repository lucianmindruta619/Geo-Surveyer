'''
'''
from django import template

import re

register = template.Library()


@register.filter
def get_survey_id( survey_obj ):
    match_obj = re.match( '^\d+', survey_obj.name )
    if match_obj:
        return match_obj.group()

    return ''